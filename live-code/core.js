function App() {

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

    // Browser: {
    //   show: function(body) {
    //     document.getElementsByTagName('body')[0].innerHTML = body;
    //   }
    // }
  }
}

// window.requestAnimationFrame(time => {
//   var App = document.getElementsByTagName('body')[0].__x.getUnobservedData();
//   var Storage = App.Storage;
//   var id = window.location.search.substr(1);
//   if (id) {
//     Storage.read(id, doc => App.Browser.show(doc.body));
//   }
// });


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
