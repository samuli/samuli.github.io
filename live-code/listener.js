var scriptsToLoad = [];
var scriptsLoaded = [];
var oldHref = document.location.href;


window.addEventListener("message", (e) => {
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
