
function App() {
  var scriptsToLoad = [];
  var scriptsLoaded = [];
  var inlineScripts = [];
  var onJSLoadedCB = null;

  var showDoc = function(doc, bodyElement) {
    var d = document;

    d.getElementsByTagName('head')[0].innerHTML = doc.head;
    var headEl = d.getElementsByTagName('head')[0];
    var tags = [];
    // Collect external scripts to be loaded
    Array.from(headEl.getElementsByTagName("script")).forEach(function (s) {
      if (s.attributes && s.attributes.src) {
        var src = s.attributes.src.nodeValue;
        if (scriptsLoaded.includes(src)) {
          s.remove();
        } else {
          var defer = typeof s.attributes.defer !== 'undefined';
          scriptsToLoad.push([src, defer]);
          s.remove();
        }
      } else {
        inlineScripts.push(s);
        s.remove();
      }
    });
    // Load external scripts
    scriptsToLoad.forEach(([src,defer]) => {
      var tag = d.createElement("script");
      tag.setAttribute("src", src);
      if (defer) {
        tag.setAttribute("defer", "defer");
      }
      tag.setAttribute("type", "text/javascript");
      tag.addEventListener("load", function(e) {
        scriptsLoaded.push(src);
        if (scriptsToLoad.length === scriptsLoaded.length
            //&& window.__init__
            && onJSLoadedCB
        ) {
          onJSLoadedCB();
          //__init__();
        }
      });
      headEl.appendChild(tag);
    });
    inlineScripts.forEach(tag => {
      var scriptTag = d.createElement("script");
      scriptTag.setAttribute("type", "text/javascript");
      var el = d.createTextNode(tag.innerText);
      scriptTag.appendChild(el);
      headEl.appendChild(scriptTag);
    });

    // Body
    if (typeof bodyElement === 'undefined') {
      bodyElement = d.getElementsByTagName('body')[0];
    }
    bodyElement.innerHTML = doc.body;
  };

  var exportHtml = function(doc, cb, static) {
    var win = window.open('export.html', 'export');
    win.addEventListener('load', () => {
      win.$store = {App: window.__app__};
      win.showDoc(doc);
      win.exportHtml(function(data) {
        win.close();
        if (typeof static === 'undefined' || !static) {
          data = {...doc, css: data.css};
        }
        cb(data);
      }, static);
    });
  };

  var parseUrlId = url => url.substr(1);
  var urlId = () => parseUrlId(window.location.search);

  var navigate = function(id) {
    if (typeof id !== 'undefined') {
      var loc = window.location;
      window.location = `${loc.protocol}//${loc.host}${loc.pathname}?${id}`;
    }
  };

  var addHistory = function(id) {
    var loc = window.location;
    var newurl = `${loc.protocol}//${loc.host}${loc.pathname}?${id}`;
    window.history.pushState({path:newurl, id}, id, newurl);
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

  window.addEventListener('popstate', function (e) {
    if (e.state) {
      window.Spruce.store("App").Storage.read(e.state.id, doc => {
        showDoc(doc);
      });
    }
  });

  var naviId = urlId();
  if (naviId) {
    addHistory(naviId);
  }

  return {
    isJSLoaded: () => scriptsLoaded.length === scriptsToLoad.length,
    onJSLoaded: (cb) => onJSLoadedCB = cb,

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
        var startupApp = 'dump';
        this.db.code.count().then(function(cnt) {
          if (!cnt) {
            bootstrap(me.db).then(docs => {
              me.documents = docs;
              me.docIds = docs.map(d => d.id);
              if (me.docIds) {
                navigate(me.documents.filter(d => d.title === startupApp)[0].id);
              }
            });
          } else {
            me.db.code.toArray()
                .then(docs => {
                  me.documents = docs.map(doc => {
                    return { id: doc.id, title: doc.title };
                  });
                  me.docIds = docs.map(d => d.id);
                  var appId = urlId();
                  id = appId ? appId : me.documents.filter(d => d.title === startupApp)[0].id;
                  me.open(id, doc => showDoc(doc));
                });
          }
        });
      },
      create: function(doc, cb, db) {
        var me = this;
        var data = Object.assign(docTemplate, doc);
        if (typeof db === 'undefined') {
          db = this.db;
        }
        db.code.put(data).then(function(id) {
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
        this.documents = this.documents.filter(d => parseInt(id) !== parseInt(d.id));
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
        console.log("read: ", id);
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
      },
      dump: function(cb) {
        this.db.export({prettyJson: true, progressCallback: ({totalRows, completedRows}) => {
          console.log("`Exported ${completedRows}/${totalRows}`");
        }}).then(res => {
          cb(res);
          console.log("res", res);
        });
      }
    },

    Browser: {
      show: showDoc,
      go: id => {
        window.Spruce.store("App").Storage.read(id, doc => {
          showDoc(doc);
          addHistory(id);
        });
      },
      exportHTML: exportHtml,
      docId: urlId,
      navigate,
    }
  }
}
