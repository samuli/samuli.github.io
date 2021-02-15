var scriptsToLoad = [];
var scriptsLoaded = [];

var showDoc = function(doc) {
  var d = document;

  d.getElementsByTagName('head')[0].innerHTML = doc.head;
  var headEl = d.getElementsByTagName('head')[0];
  var tags = [];
  Array.from(headEl.getElementsByTagName("script")).forEach(function (s) {
    if (s.attributes && s.attributes.src) {
      var src = s.attributes.src.nodeValue;
      if (scriptsLoaded.includes(src)) {
        s.remove();
      } else {
        var tag = d.createElement("script");
        tag.setAttribute("src", src);
        tag.setAttribute("type", "text/javascript");
        scriptsToLoad.push(src);
        tag.addEventListener("load", function(e) {
          scriptsLoaded.push(src);
          scriptsToLoad = scriptsToLoad.filter(s => s !== src);
          if (!scriptsToLoad.length && window.__init__) {
            __init__();
          }
        });
        tags.push(tag);
        s.remove();
      }
    } else {
      var scriptTag = d.createElement("script");
      scriptTag.setAttribute("type", "text/javascript");
      var el = d.createTextNode(s.innerText);
      scriptTag.appendChild(el);
      headEl.appendChild(scriptTag);
      s.remove();
    }
  });
  tags.forEach(function(tag) {
    headEl.appendChild(tag);
  });


  // Body
  if (typeof bodyElement === 'undefined') {
    bodyElement = d.getElementsByTagName('body')[0];
  }
  bodyElement.innerHTML = doc.body;
};

var onlyUnique = function(value, index, self) {
  return self.indexOf(value) === index;
};

var getNonClassStyleRuleValues = function() {
  var doc = document;
  var result = [];

  var sheets = doc.styleSheets;
  for (var i = 0, l = sheets.length; i < l; i++) {
    var sheet = sheets[i];
    if ( !sheet.cssRules ) {
      continue;
    }
    for (var j = 0, k = sheet.cssRules.length; j < k; j++) {
      var rule = sheet.cssRules[j];
      if (!rule.selectorText) {
        continue;
      }
      var rules = rule.selectorText.split(",");
      for (var l = 0; l < rules.length; l++) {
        if (rules[l].trim().substring(0,1) !== ".") {
          var key = rule.selectorText;
          var val = rule.cssText;
          if (result.filter(([k,v]) => k === key && v === val).length) {
            continue;
          }
          result.push([rule.selectorText, rule.cssText]);
          continue;
        }
      }
    }
  }
  return result.filter(onlyUnique);
};

var getStyleRuleValue = function(selector) {
  var doc = document;
  var sheets = doc.styleSheets;
  for (var i = 0, l = sheets.length; i < l; i++) {
    var sheet = sheets[i];

    if ( !sheet.cssRules ) {
      continue;
    }
    for (var j = 0, k = sheet.cssRules.length; j < k; j++) {
      var rule = sheet.cssRules[j];
      if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) {
        return rule.cssText;
      }
    }
  }
  return null;
};

var exportHtml = function() {
  var doc = document;

  // root-level CSS rules
  var nonClassRules = getNonClassStyleRuleValues(doc);

  // css-class rules
  var reg = /class="([a-zA-Z0-9\.\-_\s]*)/g;
  var html = document.getElementsByTagName("html")[0].innerHTML;
  arr = [...html.matchAll(reg)]
    .map(res => res[1].split(" "))
    .reduce((acc, el) => acc.concat(el), [])
    .filter(onlyUnique)
    .map(className => getStyleRuleValue(`.${className.replace(".", "\\.")}`), doc)
    .concat(["*","body"].map(className => getStyleRuleValue(className, doc)))
  ;

  return nonClassRules.concat(arr).join("");
};
