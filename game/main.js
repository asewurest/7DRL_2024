import { RL, RLFont } from '../core/rl.js';

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
  let chars = ' 0123456789.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!(),:/┌┐└┘│|─┤├┼┬┴╔╗╚╝║═╣╠╬╦╩#╴╶╵╷╡╞╨╥▒@↑↓←→';
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
  
  rl.on('load_level', () => {
      let wall = rl.material('wall', {
          shaping : 'wall',
          color   : 0xFF_CC_AA,
          // tangible: true
      });
      let floor = rl.material('floor', {
          color: 0x22_33_44,
          character: '▒'
      });
      return {
          background: Array(100).fill(0).map(_ => Array(100).fill(floor)),
          foreground: Array(100).fill(0).map((_, i) => Array(100).fill(0).map((_, j) => (i == 0 || j == 0 || i == 99 || j == 99) ? wall : null)),
          w: 100,
          h: 100,
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
