import { RL, RLFont } from '../core/rl.js';
import { SIZE_X, SIZE_Y, generate } from './generation.js';

const canvas = document.getElementById('roguelike');
canvas.width  = 10 * 80;
canvas.height = 10 * 60;
const SIDEBAR_WIDTH = 15;
const LOGGER_HEIGHT = 5;

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
  let chars = ' 0123456789.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!(),:/┌┐└┘│|─┤├┼┬┴╔╗╚╝║═╣╠╬╦╩#╴╶╵╷╡╞╨╥▒@↑↓←→┄┈┆┊?';
  for (let i = 0; i < chars.length; i++) {
    char_data[chars[i]] = { x: 10 * (i % 16), y: 10 * Math.floor(i / 16) };
  }
  let font = new RLFont(10, 10, image, char_data);
  let rl = new RL({ rows: 30, cols: 40, scale: 1, font, c: canvas });
  rl.logger(0, 60 - LOGGER_HEIGHT, 80, LOGGER_HEIGHT, true);
  // document.body.appendChild(rl.canvas);
  let ui_stack = [];
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
      description: 'You',
      light_intensity: 20,
  };
  
  addEventListener('keydown', e => {
      if (ui_stack.length == 0) {
          if (e.key == 'ArrowUp') {
              movement_listener([{ kind: 'move', x: 0, y: -1 }])
          } else if (e.key == 'ArrowLeft') {
              movement_listener([{ kind: 'move', x: -1, y: 0 }])
          } else if (e.key == 'ArrowDown') {
              movement_listener([{ kind: 'move', x: 0, y: 1 }])
          } else if (e.key == 'ArrowRight') {
              movement_listener([{ kind: 'move', x: 1, y: 0 }])
          }
      } else {
          if (ui_stack[0].key_handler) {
              ui_stack[0].key_handler(e.key);
          }
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
      },
      description: 'Closed Door',
  });
  let wall = rl.material('wall', {
      shaping : 'wall',
      color   : 0x99_99_99,
      // tangible: true
      description: 'Wall',
  });
  let fake_wall = rl.material('fake_wall', {
      shaping  : 'wall',
      color    : 0x99_99_99,
      tangible : false,
      description: 'Wall?',
  });
  wall.shaping.compatible.push(door);
  wall.shaping.compatible.push(fake_wall);
  door.shaping.compatible.push(wall);
  door.shaping.compatible.push(fake_wall);
  fake_wall.shaping.compatible.push(wall);
  fake_wall.shaping.compatible.push(door);
  let floor0 = rl.material('floor0', {
      color: 0x22_33_44,
      character: '▒',
      description: 'Floor',
  });
  let floor1 = rl.material('floor1', {
      color: 0x44_22_33,
      character: '▒',
      description: 'Floor',
  });
  let floor2 = rl.material('floor2', {
      color: 0x33_44_22,
      character: '▒',
      description: 'Floor',
  });
  let floor_source = rl.material('floor_source', {
      color: 0x22_22_22,
      character: '▒',
      description: 'Floor',
  });
  let floor_target = rl.material('floor_target', {
      color: 0x44_44_44,
      character: '▒',
      description: 'Floor',
  });
  let floor_hidden = rl.material('floor_hidden', {
      color: 0x22_44_44,
      character: '▒',
      description: 'Floor',
  });
  let floor_unreachable = rl.material('floor_unreachable', {
      color: 0x77_77_77,
      character: '#',
      description: 'how?',
  });
  rl.on('load_level', () => {
      let { background, foreground } = generate({ fake_wall, wall, floors: { floor_unreachable, floor0, floor1, floor2, floor_source, floor_target, floor_hidden }, door, x: 1, y: 1 });
      return {
          background,
          foreground,
          w: SIZE_X,
          h: SIZE_Y,
          entities: [player],
          light_sources: [player],
      }
  });
  rl.start_loop();
  window.rl = rl;
  window.RLFont = RLFont;
  window.font = font;
  rl.on('tick_end', () => {});
  
  let main_actions = rl.action_panel(0, 0, 10, 8);
  main_actions.add_action('interact', 'interact', 'i', () => {});
  main_actions.add_action('look', 'look', 'l', () => {
      let overlay = rl.overlay(player.x, player.y, rl.level_of(player));
      let text_box = rl.text_box(0, 8, SIDEBAR_WIDTH, 4, 'Looking at\nYou', 0x88_88_88);
      ui_stack.push({
          key_handler: key => {
              let update = false;
              if (key == 'ArrowLeft') {
                  overlay.x--;
                  update = true;
              } else if (key == 'ArrowRight') {
                  overlay.x++;
                  update = true;
              } else if (key == 'ArrowUp') {
                  overlay.y--;
                  update = true;
              } else if (key == 'ArrowDown') {
                  overlay.y++;
                  update = true;
              } else if (key == 'Escape' || key == 'l') {
                  overlay.remove();
                  text_box.remove();
                  setTimeout(() => ui_stack.pop(), 0); // so that it doesn't reopen it instantly
              }
              
              if (update) {
                  text_box.text = 'Looking at\n' + rl.describe(rl.level_of(player), overlay.x, overlay.y).join('\n');
              }
          },
          overlay,
          text_box,
      });
  });
  rl.text_box(0, 60 - LOGGER_HEIGHT - 1, 80, 1, Array(80).fill('─').join(''), 0x33_33_33);
  rl.text_box(SIDEBAR_WIDTH, 0, 1, (60 - LOGGER_HEIGHT), Array(60 - (LOGGER_HEIGHT + 1)).fill('|').join('') + '┴', 0x33_33_33);
  window.panel = main_actions;
  
  let vp = rl.viewport(SIDEBAR_WIDTH + 1, 0, 80 - (SIDEBAR_WIDTH + 1), (60 - (LOGGER_HEIGHT + 1)));
  vp.target_x = SIZE_X / 2;
  vp.target_y = SIZE_Y / 2;
  vp.fov_entity = player;
  window.player = player;
  
  rl.log('hi');
}
