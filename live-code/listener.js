var scriptsToLoad = [];
var scriptsLoaded = [];
var oldHref = document.location.href;

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function getNonClassStyleRuleValues() {
  var result = [];

  var sheets = document.styleSheets;
  for (var i = 0, l = sheets.length; i < l; i++) {
    var sheet = sheets[i];
    if( !sheet.cssRules ) { continue; }
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
}

function getStyleRuleValue(selector) {
  var sheets = document.styleSheets;
  console.log("sel", [selector, sheets]);
  for (var i = 0, l = sheets.length; i < l; i++) {
    var sheet = sheets[i];

    if( !sheet.cssRules ) { continue; }
    console.log("sheet", [sheet, selector]);
    for (var j = 0, k = sheet.cssRules.length; j < k; j++) {
      var rule = sheet.cssRules[j];
      //console.log("rule", [rule.selectorText]);
      if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) {
        console.log(rule.cssText);
        return rule.cssText;
      }
    }
  }
  return null;
}


function exportHtml() {
  // root-level CSS rules
  var nonClassRules = getNonClassStyleRuleValues();

  // css-class rules
  var reg = /class="([a-zA-Z0-9\.\-_\s]*)/g;
  var html = document.getElementsByTagName("html")[0].innerHTML;
  arr = [...html.matchAll(reg)]
    .map(res => res[1].split(" "))
    .reduce((acc, el) => acc.concat(el), [])
    .filter(onlyUnique)
    .map(className => getStyleRuleValue(`.${className.replace(".", "\\.")}`))
    .concat(["*","body"].map(className => getStyleRuleValue(className)))
  ;

  return nonClassRules.concat(arr).join("");
}

window.addEventListener("message", (e) => {
  if (e.data.cmd) {
    window.opener.postMessage({ cmd: "export", styles: exportHtml(), body: document.getElementById("body").innerHTML });
    return;
  }
  if (e.data.head) {
    document.getElementById("head").innerHTML = e.data.head;
    var tags = [];
    Array.from(document.getElementById('head').getElementsByTagName("script")).forEach(function (s) {
      if (s.attributes && s.attributes.src) {
        var src = s.attributes.src.nodeValue;
        if (scriptsLoaded.includes(src)) {
          s.remove();
        } else {
          var tag = document.createElement("script");
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
        var scriptTag = document.createElement("script");
        scriptTag.setAttribute("type", "text/javascript");
        var el = document.createTextNode(s.innerText);
        scriptTag.appendChild(el);
        document.getElementById("head").appendChild(scriptTag);
        s.remove();
      }
    });
    tags.forEach(function(tag) {
      document.getElementById("head").appendChild(tag);
    });

    // Array.from(document.getElementById('head').getElementsByTagName("link")).forEach(function (el) {
    //   if (el.attributes.rel !== "undefined" && el.attributes.rel.nodeValue === "stylesheet") {
    //     var href = el.attributes.href.nodeValue;
    //     if (!href.startsWith("http")) {
    //       var loc = window.location.toString();
    //       var localHref = loc.substring(0, loc.lastIndexOf("/")) + "/" + href;
    //       console.log("local",  [loc, localHref]);
    //       el.setAttribute("href", localHref);
    //     }
    //   }
    // });

  }
  if (e.data.body) {
    document.getElementById("body").innerHTML = e.data.body;
    if (window.__init__) {
      __init__();
    }
  }
  if (e.data.script) {
    var s = document.getElementById("__app__");
    if (s) {
      s.remove();
    }

    var scriptTag = document.createElement("script");
    scriptTag.setAttribute("id", "__app__");
    scriptTag.setAttribute("type", "text/javascript");
    var code = `function __init__() { ${e.data.script} };`;
    var el = document.createTextNode(code);
    scriptTag.appendChild(el);
    document.getElementById("head").appendChild(scriptTag);
  }

  Array.from(document.getElementById('body').getElementsByTagName('a')).forEach(function (el) {
    el.addEventListener("click", function(e) {
      e.preventDefault();
      var target = e.target;
      var maxDepth = 100;
      var cnt = 0;
      while (typeof target.attributes.href === "undefined") {
        if (typeof target.parentNode === "undefined") {
          target = null;
          return;
        }
        target = target.parentNode;
        if (cnt++ > maxDepth) {
          console.log("maxDepth exceeded");
          return;
        }
      }
      if (target) {
        window.opener.postMessage({ cmd: "navigate", url: target.attributes.href.nodeValue}, "*" );
      }
    });
  });
});

// window.addEventListener("load", function(e) {
//   var bodyList = document.querySelector("body");
//   var observer = new MutationObserver(function(mutations) {
//     mutations.forEach(function(mutation) {
//       console.log("mutate");
//       if (oldHref != document.location.href) {
//         oldHref = document.location.href;
//         todo
//         console.log("navigate", document.location.href);
//         return false;
//       }
//     });
//   });
//   var config = {
//     childList: true,
//     subtree: true
//   };
//   observer.observe(bodyList, config);
// });
