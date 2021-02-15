
function App() {
  var scriptsToLoad = [];
  var scriptsLoaded = [];

  var showDoc = function(doc, bodyElement) {
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

  var exportHtml = function(doc, cb) {
    var win = window.open('export.html', 'export');
    win.addEventListener('load', () => {
      win.showDoc(doc);
      setTimeout(() => {
        var css = win.exportHtml();
        win.close();
        cb(css);
      }, 200);
    });
  };

  var urlId = window.location.search.substr(1);
  var navigate = function(id) {
    if (typeof id !== 'undefined') {
      var loc = window.location;
      window.location = `${loc.protocol}//${loc.host}${loc.pathname}?${id}`;
    }
  };

  var docTemplate = {
    title: '', body: '', head: '<link href="stack.css" rel="stylesheet">'
  };

  var bootstrap = async function(db) {
    var apps = ['editor', 'watch', 'export'];
    var ids = [];
    await Promise.all(apps.map(async app => {
      var res = await fetch(`apps/${app}.html`);
      if (res.status !== 200) {
        console.log(`Error installing app ${app}`);
      } else {
        var body = await res.text();
        var doc = {
          title: app, body, head: '<link href="stack.css" rel="stylesheet">'
        };
        //var doc = Object.assign(docTemplate, {title: app, body});
        var id = await db.code.add(doc);
        ids.push({id, title:doc.title});
      }
    }));
    return ids;
  };

  return {
    Storage: {
      db: new Dexie("code"),
      docIds: [],
      documents: [],
      docId: null,

      init: function() {
        var me = this;
        this.db.version(14).stores({
          code: '++id, title, body, head'
        });

        this.db.open();
        var me = this;
        this.db.code.count().then(function(cnt) {
          if (!cnt) {
            bootstrap(me.db).then(docs => {
              me.documents = docs;
              me.docIds = docs.map(d => d.id);
              if (me.docIds) {
                navigate(me.documents.filter(d => d.title === 'editor')[0].id);
              }
            });
          } else {
            me.db.code.toArray()
                .then(docs => {
                  me.documents = docs.map(doc => {
                    return { id: doc.id, title: doc.title };
                  });
                  me.docIds = docs.map(d => d.id);
                  id = urlId ? urlId : me.documents.filter(d => d.title === 'editor')[0].id;
                  me.open(id, doc => showDoc(doc));
                });
          }
        });
      },
      create: function(doc, cb, db) {
        var me = this;
        doc = Object.assign(docTemplate, doc);
        if (typeof db === 'undefined') {
          db = this.db;
        }
        db.code.add(doc).then(function(id) {
          me.docIds.push(id);
          me.write({...doc, id});
          me.documents.push({id,title:doc.title});
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
          this.create({body: '', 'head': '', title: ''});
        }
      },
      open: function(id, cb) {
        this.docId = parseInt(id);
        this.read(this.docId, cb);
      },
      read: function(id, cb) {
          this.db.code.get(parseInt(id)).then(function(res) {
          cb(res);
        }).catch(function (err) {
          console.log("err", err);
        });
      },
      write: function(doc, cb) {
        if (typeof cb === 'undefined') {
          cb = _res => {};
        }
        this.db.code.put(Object.assign({}, {...doc})).then(res => cb());
      }
    },

    Browser: {
      show: showDoc,
      exportHTML: exportHtml,
      docId: urlId,
      navigate,
    }
  }
}
