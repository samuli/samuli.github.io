
function App() {
  var scriptsToLoad = [];
  var scriptsLoaded = [];

  return {
    Storage: {
      db: new Dexie("code"),
      docIds: [],

      init: function() {
        var me = this;
        this.db.version(5).stores({
          code: '++id, body, head, script'
        });
      },
      documents: function(cb) {
        var me = this;
        this.db.code.orderBy('id').primaryKeys(function (ids) {
          me.docIds = ids;
          cb(ids);
        });
      },
      create: function(doc) {
        var me = this;
        this.db.code.add(doc).then(function(id) {
          me.docIds.push(id);
          me.write({...doc, id});
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
      show: function(doc) {
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
        document.getElementsByTagName('body')[0].innerHTML = doc.body;
      }
    }
  }
}

setTimeout(() => { //window.requestAnimationFrame(time => {
  var App = document.getElementsByTagName('body')[0].__x.getUnobservedData();
  var Storage = App.Storage;
  Storage.init();
  var id = window.location.search.substr(1);
  console.log("init", id);
  if (id) {
    Storage.read(id, doc => { console.log("doc redi"); App.Browser.show(doc) });
  }
}, 40);


// function Browser() {
//   return {
//     open: function() {

//     },
//     sync: function() {

//     },
//     renderMarkup: function() {

//     },
//     renderCSS: function() {

//     }
//   };
// }
