const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const SchemaSource = Gio.SettingsSchemaSource.new_from_directory(
  Me.dir.get_path(), Gio.SettingsSchemaSource.get_default(), false);
const settings = new Gio.Settings({
  settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'], true)
});
const bindings = new Gio.Settings({
  settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'] + '.keybindings', true)
});

let _current_tiles = {};
let _current_layout = 'horizontal';

function tileInit(win) {
//if (settings.get_boolean('reverse-order')){
  //_current_tiles[win.get_stable_sequence()] = {idx: Infinity}; //
  //master-slave
  //_current_tiles[win.get_stable_sequence()] = {idx: -Infinity};  // slave-master - to order windows that have the same position !!!
  //global.log("hello - new window");
//else:
  if(_current_layout=="vertical"){
    _current_tiles[win.get_stable_sequence()] = {idx: Infinity};  // slave-master - to order windows that have the same position !!!
  }else{
    _current_tiles[win.get_stable_sequence()] = {idx: -Infinity};  // slave-master - to order windows that have the same position !!!
  }
}

function tileDestroy(win) {
  delete _current_tiles[win.get_stable_sequence()];
}

function tileInfo(win) {
  return _current_tiles[win.get_stable_sequence()] || null;
}

function tileSort(w1, w2) {
  const i1 = tileInfo(w1);
  const i2 = tileInfo(w2);
  return i1.idx > i2.idx ? 1 : i1.idx < i2.idx ? -1 : 0;
}

function tileDSort(w1, w2) { //
  const i1 = tileInfo(w1);
  const i2 = tileInfo(w2);
  return i1.idx < i2.idx ? 1 : i1.idx > i2.idx ? -1 : 0;
}

function addGaps(area, gaps) {
  return new Meta.Rectangle({
    x:      Math.floor(area.x + gaps.x),
    y:      Math.floor(area.y + gaps.y),
    width:  Math.floor(area.width - gaps.width - gaps.x),
    height: Math.floor(area.height - gaps.height - gaps.y)
  });
}

// Update data and draw if rect is given
function refreshTile(win, idx, rect) {
  const tile = tileInfo(win);
  if (tile.idx !== idx) {
    tile.idx = idx;
    const ming = settings.get_value('minimum-gaps').deep_unpack();
    const maxg = settings.get_value('maximum-gaps').deep_unpack(); //like a touch?
    tile.gaps = new Meta.Rectangle({
      x:      ming[0], //+ Math.random() * (maxg[0] - ming[0]), //random ???
      y:      ming[1], //+ Math.random() * (maxg[1] - ming[1]),
      width:  ming[2], //+ Math.random() * (maxg[2] - ming[2]),
      height: ming[3], //+ Math.random() * (maxg[3] - ming[3])
    });
  }
  if (rect) {
    rect = addGaps(rect, tile.gaps);
    win.unmaximize(Meta.MaximizeFlags.BOTH);
    win.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
  }
}

// Update all windows
function refreshMonitor(mon) {
  const wksp = global.screen.get_active_workspace();

  //if (settings.get_boolean('reverse-order')){
    const wins = wksp.list_windows()
      .filter(win => win.get_monitor() === mon)
      .filter(win => !win.fullscreen)
      .filter(tileInfo)
      .sort(tileSort);
  //}else{
  //  const wins = wksp.list_windows()
  //    .filter(win => win.get_monitor() === mon)
  //    .filter(win => !win.fullscreen)
  //    .filter(tileInfo)
  //    .sort(tileDSort);
  //}
  
  

/*  for(var i=0;i<wksp.length;i++){
    //global.log('hello tiling'+i+' = '+temp[i].toSource());

    //alert(JSON.stringify(temp[i]null, 4));
    printObject(JSON.stringify(wkspp[i],null, 4));

  }*/



  //if(_current_layout=="master_slave_horizontal" || _current_layout=="master_slave_vertical"){

  if (wins.length === 1){
    if(settings.get_boolean('maximize-single')){
      return wins[0].maximize(Meta.MaximizeFlags.BOTH);
    }/*else{
      recttmp = (Me.imports.layouts[_current_layout](settings, wins, area))[1]
      i = tileInfo(wins[0]);
    
      refreshTile(wins[0], i.idx, recttmp); //reload settings and change id
      refresh();
    }*/
  }
  const marg = settings.get_value('margins').deep_unpack();
  const area = addGaps(wksp.get_work_area_for_monitor(mon), new Meta.Rectangle({
    x:      marg[0],
    y:      marg[1],
    width:  marg[2],
    height: marg[3]
  }));
  Me.imports.layouts[_current_layout](settings, wins, area)
    .forEach((rect, idx) => refreshTile(wins[idx], idx, rect));
}

// Update multiple monitors
function refresh() {
  Meta.later_add(Meta.LaterType.RESIZE, () => {
    for (let m = 0; m < global.screen.get_n_monitors(); m++)
      refreshMonitor(m);
  });
}

let _handle_gs;
let _handle_sc;
let _handle_wm0;
let _handle_wm1;
let _handle_wm2;
let _handle_display;

// For layouts: horizontal,vertical,spiral?
function arrayNeighbor(array, el, n) {
  n += array.indexOf(el);
  const len = array.length;
  return n >= len ? array[0] : n < 0 ? array[len - 1] : array[n];
}

function isTileable(win) {
  return settings.get_strv('auto-tile-window-types')
    .some(t => win.window_type === Meta.WindowType[t]);
}



function printObject(o) {
  var out = '';
  for (var p in o) {
    out += p + ': ' + o[p] + '\n';
  }
  global.log('hello tiling '+i+' = '+out);
}

// now test it:
//var myObject = {'something': 1, 'other thing': 2};
//printObject(myObject);


function getCurrentTiles() {
/*  temp=global.screen.get_active_workspace().list_windows();
  for(i=0;i<temp.length;i++){
    //global.log('hello tiling'+i+' = '+temp[i].toSource());

    //alert(JSON.stringify(temp[i]null, 4));
    printObject(JSON.stringify(temp[i],null, 4));

  }
*/
  return global.screen.get_active_workspace().list_windows()
    .filter(tileInfo).sort(tileSort);
//    .filter(tileInfo).sort(tileDSort);
}

function getFocusedWindow(win) {
  return global.screen.get_active_workspace().list_windows()
    .filter(win => win.has_focus())[0];
}

function swapTiles(w1, w2) {
  const i1 = tileInfo(w1);
  const i2 = tileInfo(w2);
  if (i1 && i2) {
    const tmp = i1.idx;
    refreshTile(w1, i2.idx); //reload settings and change id
    refreshTile(w2, tmp); //reload settings and change id
    refresh();
  }
}

function addKeybinding(name, handler) {
  Main.wm.addKeybinding(name, bindings, 0, Shell.ActionMode.NORMAL, handler);
}

function enable() {
  _handle_gs = settings.connect('changed', refresh);
  _handle_sc = global.screen.connect('restacked', refresh);
  _handle_wm0 = global.window_manager.connect('switch-workspace', refresh);
  _handle_wm1 = global.window_manager.connect('map', (g, w) => {
    if (isTileable(w.meta_window))
      tileInit(w.meta_window);
  });
  _handle_wm2 = global.window_manager.connect('destroy', (g, w) => {
    tileDestroy(w.meta_window);
  });
  _handle_display = global.display.connect('grab-op-end', (dis, scr, w1, op) => {

    //global.log('hello tiling');
    //$journalctl /usr/bin/gnome-shell -f -o cat


    if (op !== Meta.GrabOp.MOVING)
      return;
    const p = global.get_pointer();
    const r = new Meta.Rectangle({x: p[0], y: p[1], width: 1, height: 1});
    const w2 = getCurrentTiles()
      .filter(w => w !== w1)
      .filter(w => w.get_monitor() === p[2])
      .filter(w => w.get_frame_rect().intersect(r)[0])[0];
    if (w2)
      swapTiles(w1, w2);
  });
  addKeybinding('toggle-tile', () => {
    const win = getFocusedWindow();
    if (!win)
      return;
    if (tileInfo(win))
      tileDestroy(win);
    else
      tileInit(win);
    refresh();
  });
  addKeybinding('switch-next-layout', () => {
    _current_layout = arrayNeighbor(settings.get_strv('layouts'), _current_layout, 1);
    refresh();
  });
  addKeybinding('switch-previous-layout', () => {
    _current_layout = arrayNeighbor(settings.get_strv('layouts'), _current_layout, -1);
    refresh();
  });
  addKeybinding('focus-next-tile', () => {
    const win = arrayNeighbor(getCurrentTiles(), getFocusedWindow(), 1);
    if (win)
      win.focus(global.get_current_time());
  });
  addKeybinding('focus-previous-tile', () => {
    const win = arrayNeighbor(getCurrentTiles(), getFocusedWindow(), -1);
    if (win)
      win.focus(global.get_current_time());
  });
  addKeybinding('focus-first-tile', () => {
    //const wins = wksp.list_windows().length-1;
    //const win = getCurrentTiles()[wins]; // !!!
    const win = getCurrentTiles()[0]; // !!!
    if (win)
      win.focus(global.get_current_time());
  });
  addKeybinding('swap-next-tile', () => {
    const w1 = getFocusedWindow();
    const w2 = arrayNeighbor(getCurrentTiles(), w1, 1);
    if (w1 && w2)
      swapTiles(w1, w2);
  });
  addKeybinding('swap-previous-tile', () => {
    const w1 = getFocusedWindow();
    const w2 = arrayNeighbor(getCurrentTiles(), w1, -1);
    if (w1 && w2)
      swapTiles(w1, w2);
  });
  addKeybinding('swap-first-tile', () => {
    const w1 = getFocusedWindow();
    const w2 = getCurrentTiles()[0];
    if (w1 && w2)
      swapTiles(w1, w2);
  });
  addKeybinding('increase-split', () => {
    const r = settings.get_double('split-ratio');
    settings.set_double('split-ratio', r + settings.get_double('split-ratio-step'));
  });
  addKeybinding('decrease-split', () => {
    const r = settings.get_double('split-ratio');
    settings.set_double('split-ratio', r - settings.get_double('split-ratio-step'));
  });
  addKeybinding('increase-master-count', () => {
    const m = settings.get_uint('master-count');
    settings.set_uint('master-count', m + 1);
  });
  addKeybinding('decrease-master-count', () => {
    const m = settings.get_uint('master-count');
    settings.set_uint('master-count', m - 1);
  });
  global.get_window_actors().forEach(win => {
    if (isTileable(win.meta_window))
      tileInit(win.meta_window);
  });
}

function disable() {
  settings.disconnect(_handle_gs);
  global.screen.disconnect(_handle_sc);
  global.display.disconnect(_handle_display);
  global.window_manager.disconnect(_handle_wm0);
  global.window_manager.disconnect(_handle_wm1);
  global.window_manager.disconnect(_handle_wm2);
  Main.wm.removeKeybinding('toggle-tile');
  Main.wm.removeKeybinding('switch-next-layout');
  Main.wm.removeKeybinding('switch-previous-layout');
  Main.wm.removeKeybinding('focus-next-tile');
  Main.wm.removeKeybinding('focus-previous-tile');
  Main.wm.removeKeybinding('focus-first-tile');
  Main.wm.removeKeybinding('swap-next-tile');
  Main.wm.removeKeybinding('swap-previous-tile');
  Main.wm.removeKeybinding('swap-first-tile');
  Main.wm.removeKeybinding('increase-split');
  Main.wm.removeKeybinding('decrease-split');
  Main.wm.removeKeybinding('increase-master-count');
  Main.wm.removeKeybinding('decrease-master-count');
  global.get_window_actors().forEach(win => {
    tileDestroy(win.meta_window);
  });
}
