
function App() {
  var scriptsToLoad = [];
  var scriptsLoaded = [];

  var showDoc = function(doc, bodyElement) {
    document.getElementsByTagName('head')[0].innerHTML = doc.head;
    var headEl = document.getElementsByTagName('head')[0];
    var tags = [];
    Array.from(headEl.getElementsByTagName("script")).forEach(function (s) {
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
        headEl.appendChild(scriptTag);
        s.remove();
      }
    });
    tags.forEach(function(tag) {
      headEl.appendChild(tag);
    });


    // Body
    if (typeof bodyElement === 'undefined') {
      bodyElement = document.getElementsByTagName('body')[0];
    }
    bodyElement.innerHTML = doc.body;
  };

  var onlyUnique = function(value, index, self) {
    return self.indexOf(value) === index;
  };

  var getNonClassStyleRuleValues = function() {
    var result = [];

    var sheets = document.styleSheets;
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
    var sheets = document.styleSheets;
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
  };

  return {
    Storage: {
      db: new Dexie("code"),
      docIds: [],
      docId: null,

      init: function() {
        var me = this;
        this.db.version(6).stores({
          code: '++id, body, head, script'
        });

        this.db.open();
        var id = window.location.search.substr(1);
        console.log("init", id);
        if (id) {
          this.open(id, doc => showDoc(doc));
        }
      },
      documents: function(cb) {
        var me = this;
        this.db.code.orderBy('id').primaryKeys(function (ids) {
          me.docIds = ids;
          //return ids;
          cb(ids);
        });
      },
      create: function(doc, cb) {
        var me = this;
        if (!doc) {
          doc = { body: '', head: '', script: '' };
        }
        this.db.code.add(doc).then(function(id) {
          me.docIds.push(id);
          me.write({...doc, id});
          cb(id);
        }).catch(function(err) {
          console.log(err);
        });
      },
      remove: function(id) {
        console.log("remove", id);
        this.docIds = this.docIds.filter(docId => parseInt(id) !== parseInt(docId));
        this.db.code.delete(parseInt(id));
        if (!this.docIds.length) {
          this.create({body: '', 'head': '', script: ''});
        }
      },
      open: function(id, cb) {
        this.docId = parseInt(id);
        this.read(this.docId, cb);
      },
      read: function(id, cb) {
        console.log("read", [id, this.db]);
        this.db.code.get(parseInt(id)).then(function(res) {
          cb(res);
        }).catch(function (err) {
          console.log("err", err);
        });
      },
      write: function(doc) {
        console.log("write", doc);
        this.db.code.put(Object.assign({}, {...doc}));
      }
    },

    Browser: {
      show: showDoc,
      exportHTML: exportHtml,
    }
  }
}
