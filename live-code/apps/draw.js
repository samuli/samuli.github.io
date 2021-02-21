<link href="stack.css" rel="stylesheet">

<script type="text/javascript">
function drawApp() {
  return {
    draw: false, preview: false, edit: false,
    saveData: '',
    layer: 0,
    selected: [],
    ind: 0,
    pts: [ [] ],
    stroke: [],
    undoStack: [], redoStack: [],
    lastPos: [0,0],
    delta: 0,
    minDelta: 3,
    penSizeIdx: 2, penSizes: [1,2,4,10,20], penSize: 4,
    colorIdx: 0, color: 'gray', colors: ['gray','red','blue', 'yellow'],
    colorVariantIdx: 0, colorVariant: 400, colorVariants: [100,200,300,400,500,600,700,800,900],
    bkg: document.getElementById('bkg'),
    initApp: function() {
      initTemplates();
      var top = `${this.$refs.navi.getClientRects()[0].height}px`;
      this.bkg.style.top = top;
      this.$refs.overlay.style.top = top;
    },
    mousedown: function() {
      this.draw = true;
      this.redoStack = [];
    },
    mouseup: function() {
      this.draw = false;
      this.lastPos = [0,0];
      this.endStroke(this.stroke, this.color, this.penSize);
      this.stroke = [];
    },
    mousemove: function(e) {
      if (this.draw) {
        var x = e.clientX;
        var y = e.clientY;
        var delta = Math.abs(x-this.lastPos[0]) + Math.abs(y-this.lastPos[1]);
        if (delta >= this.minDelta) {
          this.stroke.push([x, y-this.$refs.overlay.offsetTop]);
          this.lastPos = [x,y];
        }
      }
    },
    getStrokeClass: function() {
      return `text-${this.color}-${this.colorVariant}`;
    },
    endStroke: function(points, color, penSize) {
      var me = this;
      var l = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      l.setAttribute('points', points.map(([x,y]) => `${x},${y}`).join(' ') );
      l.setAttribute('class', this.getStrokeClass());
      l.addEventListener('click', function(e) {
        var t = e.srcElement;
        if (!t.getAttribute) {
          return;
        }
        if (t.classList.contains('selected')) {
          me.selected = me.selected.filter(path => path !== t);
          t.classList.remove('selected');
        } else {
          me.selected.push(t);
          t.classList.add('selected');
        }
      });
      l.style.fill = 'none';
      l.style['stroke-width'] = penSize;
      bkg.getElementById(`layer-${this.layer}`).appendChild(l);
      this.undoStack.push(l);
    },
    toggleEdit: function() {
      this.edit = !this.edit;
      if (!this.edit) {
        this.selected.forEach(p => p.classList.remove('selected'));
        this.selected = [];
      }
    },
    clear: () => {
      this.pts = [[]]; this.ind = 0; this.lastPos = [0,0];
      this.bkg.innerHTML = '';
    },
    togglePreview: function() {
      this.preview = !this.preview;
      if (this.preview) {
        this.saveData = this.getSaveData();
      }
    },
    keypress: function(e) {
      switch (e.key) {
        case "a":
          this.penSizeIdx++;
          if (this.penSizeIdx > this.penSizes.length-1) { this.penSizeIdx = 0; }
          this.penSize = this.penSizes[this.penSizeIdx];
          break;
        case "x":
          if (this.edit) {
            this.selected.forEach(p => p.parentNode.removeChild(p));
            this.selected = [];
          } else {
            this.edit = true;
          }
          break;
        case "s":
          this.layer = this.layer == 0 ? 1 : 0;
          break;
        case "z":
          if (this.undoStack.length > 0) {
            var l = this.undoStack.pop();
            l.classList.add('undo');
            this.redoStack.push(l);
          }
          break;
        case "Z":
          if (this.redoStack.length > 0) {
            var l = this.redoStack.pop();
            l.classList.remove('undo');
            this.undoStack.push(l);
          }
          break;
      }
      console.log("undo", [JSON.stringify(this.undoStack), JSON.stringify(this.redoStack)]);
      var code = e.charCode;
      var colorMap = {
        q: "gray", w: "red", e: "blue", r: "yellow"
      };
      if (code >= 49 && code < 49+this.colorVariants.length) {
        this.colorVariantIdx = code-49;
        this.colorVariant = this.colorVariants[this.colorVariantIdx];
      } else if (Object.keys(colorMap).includes(e.key)) {
        this.color = colorMap[e.key];
      }
     // console.log("key", e);
    },
    save: (title) => $store.App.Storage.create(
      { title, head: '', body: `<svg>${this.getSaveData()}</svg>` },
      id => {}
    ),
    getSaveData: function() {
      if (!this.bkg) { return; }
      this.redoStack.forEach(el => el.parentNode.removeChild(el));
      this.undoStack = this.redoStack = [];
      return this.bkg.innerHTML;
    }
  };
}
function initTemplates () {
  var templates = document.querySelectorAll('svg template');
  var el, template, attribs, attrib, count, child, content;
  for (var i=0; i<templates.length; i++) {
    el = templates[i];
    template = el.ownerDocument.createElement('template');
    el.parentNode.insertBefore(template, el);
    attribs = el.attributes;
    count = attribs.length;
    while (count-- > 0) {
      attrib = attribs[count];
      template.setAttribute(attrib.name, attrib.value);
      el.removeAttribute(attrib.name);
    }
    el.parentNode.removeChild(el);
    content = template.content;
    while ((child = el.firstChild)) {
      content.appendChild(child);
    }
  }
}
</script>

<style>
svg#bkg .selected {
  color: red !important;
  stroke-width: 8px !important;
}
svg#bkg .undo {
  display: none !important;
}
</style>
