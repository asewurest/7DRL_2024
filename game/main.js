import { RL, RLFont } from '../core/rl.js';
import { SIZE_X, SIZE_Y, generate } from './generation.js';

const canvas = document.getElementById('roguelike');
canvas.width  = 10 * 40;
canvas.height = 10 * 30;

const fullscreen_button = document.getElementById('fullscreen');
fullscreen_button.addEventListener('click', async ({ button }) => {
    if (button == 0) {
        await document.body.requestFullscreen();
        fullscreen_button.style.display = 'none';
        let handle;
        handle = setInterval(() => {
            if (document.fullscreenElement != document.body) {
                fullscreen_button.style.display = 'block';
                clearInterval(handle);
            }
        }, 100);
    }
});

let image = new Image();
image.src = './core/font.png';
image.onload = () => {
  let char_data = {};
  let chars = ' 0123456789.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!(),:/┌┐└┘│|─┤├┼┬┴╔╗╚╝║═╣╠╬╦╩#╴╶╵╷╡╞╨╥▒@↑↓←→┄┈┆┊';
  for (let i = 0; i < chars.length; i++) {
    char_data[chars[i]] = { x: 10 * (i % 16), y: 10 * Math.floor(i / 16) };
  }
  let font = new RLFont(10, 10, image, char_data);
  let rl = new RL({ rows: 30, cols: 40, scale: 1, font, c: canvas });
  rl.logger(0, 25, 60, 5, true);
  // document.body.appendChild(rl.canvas);
  let movement_listener = () => {};
  let player = {
      'character': '@',
      'color': 0xFF_FF_00,
      'get_next_moves': () => new Promise(resolve => {
          movement_listener = m => {
              resolve(m);
              movement_listener = () => {};
          }
      }),
      x: 1,
      y: 1,
  };
  
  addEventListener('keydown', e => {
      if (e.key == 'ArrowUp') {
          movement_listener([{ kind: 'move', x: 0, y: -1 }])
      } else if (e.key == 'ArrowLeft') {
          movement_listener([{ kind: 'move', x: -1, y: 0 }])
      } else if (e.key == 'ArrowDown') {
          movement_listener([{ kind: 'move', x: 0, y: 1 }])
      } else if (e.key == 'ArrowRight') {
          movement_listener([{ kind: 'move', x: 1, y: 0 }])
      }
  });
  let door = rl.material('door', {
      character : '┄',
      color     : 0x99_55_11,
      tangible  : false,
      shaping   : {
          'default': '┄',
          0b1001: '┆',
          0b0110: '┄',
          compatible: [],
      }
  });
  let wall = rl.material('wall', {
      shaping : 'wall',
      color   : 0x99_99_99,
      // tangible: true
  });
  let fake_wall = rl.material('fake_wall', {
      shaping  : 'wall',
      color    : 0x99_CC_99,
      tangible : false,
  });
  wall.shaping.compatible.push(door);
  wall.shaping.compatible.push(fake_wall);
  door.shaping.compatible.push(wall);
  door.shaping.compatible.push(fake_wall);
  fake_wall.shaping.compatible.push(wall);
  fake_wall.shaping.compatible.push(door);
  let floor0 = rl.material('floor0', {
      color: 0x22_33_44,
      character: '▒'
  });
  let floor1 = rl.material('floor1', {
      color: 0x44_22_33,
      character: '▒'
  });
  let floor2 = rl.material('floor2', {
      color: 0x33_44_22,
      character: '▒'
  });
  let floor_source = rl.material('floor_source', {
      color: 0x22_22_22,
      character: '▒'
  });
  let floor_target = rl.material('floor_target', {
      color: 0x44_44_44,
      character: '▒'
  });
  let floor_hidden = rl.material('floor_hidden', {
      color: 0x22_44_44,
      character: '▒'
  });
  rl.on('load_level', () => {
      let { background, foreground } = generate({ fake_wall, wall, floors: { floor0, floor1, floor2, floor_source, floor_target, floor_hidden }, door, x: 1, y: 1 });
      return {
          background,
          foreground,
          w: SIZE_X,
          h: SIZE_Y,
          entities: [player],
      }
  });
  rl.start_loop();
  window.rl = rl;
  window.RLFont = RLFont;
  window.font = font;
  rl.on('tick_end', () => {});
  
  let panel = rl.action_panel(0, 0, 10, 25);
  window.panel = panel;
  
  let vp = rl.viewport(10, 0, 30, 25);
  vp.track = player;
  window.player = player;
}
