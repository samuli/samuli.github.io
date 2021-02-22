var scriptsToLoad = [];
var scriptsLoaded = [];

async function expandMacros(str) {
  var reg = /{{(.*)}}/g;
  var ids = [...str.matchAll(reg)];
  ids = ids.map(([match,id]) => id).filter(onlyUnique).map(id => parseInt(id));
  var docs = await $store.App.Storage.db.code.bulkGet(ids);

  str = str.replaceAll(reg, function(match) {
    var id = match.substr(2);
    id = parseInt(id.substr(0,id.length-2));
    var doc = docs.filter(d => d.id === id)[0];
    return doc.body;
  });

  return str;
}

var showDoc = async function(doc) {
  var d = document;

  doc.body = await expandMacros(doc.body);

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
      headEl.prepend(scriptTag);
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

var exportHtml = function(cb, static) {
  setTimeout(function() {
    static = typeof static !== 'undefined' ? static : false;
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
    var css = arr.concat(nonClassRules).join("");
    var bodyEl = doc.getElementsByTagName("body")[0];
    var body = bodyEl.innerHTML;
    var headEl = doc.getElementsByTagName("head")[0];
    var head = headEl.innerHTML;

    if (static) {
      var staticString = false;
      var preserveScriptTags = true;

      bodyEl.innerHTML = body;
      headEl.innerHTML = head;

      Array.from(headEl.querySelectorAll("link[rel=\"stylesheet\"]")).forEach(el => {
          el.parentNode.removeChild(el);
      });

      // script tags
      if (!preserveScriptTags) {
        Array.from(headEl.getElementsByTagName("script")).forEach(el => {
            el.parentNode.removeChild(el);
        });
        Array.from(bodyEl.getElementsByTagName("script")).forEach(el => {
            el.parentNode.removeChild(el);
        });
      }

      var xxStaticElements = [];

      // template tags
      Array.from(bodyEl.getElementsByTagName("template")).forEach(el => {
          var children = Array.from(el.querySelectorAll("*"));
          for (let i=0; i<children.length; i++) {
            let attr = el.attributes;
            if (!attr) {
              break;
            }
            let xxStatic = attr.getNamedItem("xx-static");
            if (xxStatic) {
              xxStaticElements.push(el);
              break;
            }
          }
          if (staticString || el.attributes.getNamedItem("xx-static")) {
            el.parentNode.removeChild(el);
          }
      });
      // alpine x-attributes and xx-static|xx-class
      var elements = Array.from(bodyEl.querySelectorAll("*"));
      for (let i=0; i<elements.length; i++) {
        let el = elements[i];
        let attr = el.attributes;
        if (!attr) {
          continue;
        }
        let staticAttr = null;
        let xxStatic = attr.getNamedItem("xx-static");
        let xxClass = attr.getNamedItem("xx-class");
        if (xxStatic) {
          var val = xxStatic.nodeValue;
          if (!val || val === "") {
              staticAttr = true;
          } else {
            staticAttr = val.split(" ").map(s => s.trim());
          }
          xxStaticElements.push(el);
        } else if (xxClass) {
          xxStaticElements.push(el);
        }
        let remove = [];
        for (let j=0; j<attr.length; j++) {
          let name = attr[j].nodeName;
          if (/^(x-|@)/.test(name)
            && (staticString
                || (staticAttr !== null && (staticAttr === true || staticAttr.includes(name))))
          ) {
            remove.push(name);
          }
        }
        remove.forEach(name => el.removeAttribute(name));
      }
      xxStaticElements.forEach(el => {
          el.removeAttribute("xx-static");
          el.removeAttribute("xx-class");
      });

      body = bodyEl.innerHTML;
      head = headEl.innerHTML;
    }

    cb({ css,body,head });
  }, 1000);
};
