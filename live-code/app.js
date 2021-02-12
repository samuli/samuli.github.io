var html = null;
var fileName = null;

function app() {
  var win =  [];
  var doc = null;

  return {
    editor: null,
    db: new Dexie("code"),
    section: 'body',
    docId: 1,
    docIds: [],
    sync: true,
    editorInterval: null,

    send: function (w, currentSectionOnly = false) {
      let data = {};
      if (currentSectionOnly) {
        data[this.section] = doc[this.section];
      } else {
        data = {...doc};
      }
      //console.log("post", data);
      w.postMessage(data, window.location.toLocaleString());
    },
    sendAll: function (currentSectionOnly = false) {
      for (var i=0; i<win.length; i++) {
        this.send(win[i], currentSectionOnly);
      }
    },
    openWin: function () {
      var w = window.open(`${window.location.toString().replace("index.html", "")}listener.html`, `win-{win.length}`);
      win.push(w);
      var me = this;
      setTimeout(() => { me.send(w) }, 200);
    },
    createEditor: function () {
      if (!this.editor) {
        var el = document.getElementById("editor");
        var conf = {
          value: el.value,
          mode : "xml",
          htmlMode: true,
          lineNumbers: true,
          tabSize: 2,
        };
        var me = this;
        this.editor = CodeMirror.fromTextArea(el, conf);
        this.editor.setSize("100%", window.innerHeight-55);
        this.editor.setOption("extraKeys", {
          "Ctrl-Space": function(cm) {
            me.sync = !me.sync;
          }
        });
        var me = this;

        this.editor.on("change", function () {
          if (me.editorInterval) {
            clearInterval(me.editorInterval);
          }
          me.editorInterval = setTimeout(function() {
            var val = me.editor.getValue();
            doc[me.section] = val;
            me.db.code.put(doc);
            if (me.sync) {
              me.sendAll(true);
            }
          }, 700);
        });
      }
    },
    initEditor: function () {
      if (!this.editor) {
        return;
      }
      this.editor.setOption("mode", this.section === 'script' ? 'javascript' : 'xml');
      this.editor.setValue(doc[this.section] || "");
      var me = this;
      setTimeout(function() {
        me.editor.refresh();
      },100);
    },
    getSyncCmd: function () {
      return this.section === 'script' ? this.openWin : this.sendAll;
    },
    wrapScript: function(data) {
      return `<script type="text/javascript">window.addEventListener("load", function() { ${data} });</` + "script>";
    },

    allowDownload: false,
    sections: ['body', 'head', 'script'],

    setSync: function (enabled) {
      this.sync = this.sync = enabled;
    },
    setSection: function (id) {
      this.section = id;
      this.initEditor();
      this.setSync(id === 'body');
    },
    newDoc: function() {
      doc = { head: '<meta charset="utf-8">', body: '', script: '' };
      var me = this;
      this.db.code.add(doc).then(function(id) {
        me.docId = id;
        me.docIds.push(id);
        me.initEditor();
      }).catch(function(err) {
        console.log(err);
      });
    },
    deleteDoc: function() {
      this.docIds = this.docIds.filter(id => parseInt(id) !== parseInt(this.docId));
      this.db.code.delete(parseInt(this.docId));
      if (this.docIds.length) {
        this.docId = this.docIds[0];
        this.openDoc();
      } else {
        this.newDoc();
      }
    },
    openDoc: function () {
      var me = this;
      this.db.code.get(parseInt(this.docId)).then(function(res) {
        doc = res || { id: me.docId, head: '', body: '', script: '' };
        me.initEditor();
      }).catch(function (err) {
        console.log("err", err);
        me.newDoc();
      });
    },
    downloadDoc: function (cssStyles) {
      win[0].postMessage({cmd: "export"}, window.location.toLocaleString());
    },
    mounted: function () {
      this.createEditor();
      var me = this;
      this.db.version(5).stores({
        code: '++id, body, head, script'
      });

      this.db.code.orderBy('id').primaryKeys(function (ids) {
        const firstDoc = !ids.length;
        if (firstDoc) {
          me.newDoc();
        }
        if (!firstDoc) {
          me.docIds = ids;
          me.docId = ids[0];
          me.openDoc();
        }
      });


      window.addEventListener("message", function (e) {
        switch (e.data.cmd) {
            case "navigate":
              me.docId = parseInt(e.data.url.replace(".html", ""));
              me.openDoc();
              break;
            case "export":
              var fileName = `${this.docId}.html`;
              var body = e.data.body; //doc.body;
              var html = `<!doctype html><html lang="en">
                <head>
                    ${doc.head}${doc.script && me.wrapScript(doc.script)}
                    <style>${e.data.styles}</style>
                    </head><body>${body}</body></html>`;
              var blob = new Blob([html], {
                type: "text/plain;charset=utf-8"
              });
              saveAs(blob, fileName);
              break;
        }
      }, false);
    },
    getSection: () => this.section,
  }
};
