function canvas_color(c) {
  return '#' + c.toString(16).padEnd(6, '0');
}

export class RL {
  constructor(options) {
    let { rows, cols, font, c, background, scale } = (options || {});
    font       = font       || RLFont.default_font();
    rows       = rows       || 25;
    cols       = cols       || 80;
    scale      = scale      || 1;
    background = background || 0x000000;
    /** @type {number} */
    this.rows = rows;
    /** @type {number} */
    this.cols = cols;
    /** @type {number} */
    this.scale = scale;
    /** @type {RLFont} */
    this.font = font;
    /** @type {number} */
    this.background = background;
    /** @type {number} */
    this.width = cols * font.char_w;
    /** @type {number} */
    this.height = rows * font.char_h;
    /** @type {number} */
    this.pixel_width = scale * cols * font.char_w;
    /** @type {number} */
    this.pixel_height = scale * rows * font.char_h;
    if (c instanceof CanvasRenderingContext2D) {
      this.canvas = c.canvas;
      this.ctx    = c;
    } else if (c instanceof HTMLCanvasElement) {
      this.canvas = c;
      this.ctx    = c.getContext('2d');
    } else {
      this.canvas = document.createElement('canvas');
      this.ctx    = this.canvas.getContext('2d');
      this.canvas.width  = this.pixel_width;
      this.canvas.height = this.pixel_height;
    }
    
    this.ctx.imageSmoothingEnabled = false;
  }
  
  start_loop() {
    this.stop_loop();
    this.loop = requestAnimationFrame(() => this.update());
    this.then = performance.now();
  }
  
  stop_loop() {
    if (this.loop !== undefined) {
      cancelAnimationFrame(this.loop);
      delete this.loop;
    }
  }
  
  update() {
    let now = performance.now();
    const delta = (now - this.then) / 1000;
    this.then   = now;
    const ctx   = this.ctx;
    const old_matrix = ctx.getTransform();
    
    ctx.fillStyle = canvas_color(this.background);
    ctx.fillRect(0, 0, this.pixel_width, this.pixel_height);

    ctx.scale(this.scale, this.scale);
    
    for (let i = this.rows; i < this.rows * this.cols; i++) {
      this.font.draw_char(ctx, 'A', 10 * (i % this.rows), 10 * Math.floor(i / this.rows), (i % 10) * 5329099);
    }
    
    ctx.fillStyle = 'white';
    ctx.fillText(delta.toString(), 0, 0);
    
    ctx.setTransform(old_matrix);
    this.loop = requestAnimationFrame(() => this.update());
  }
}

export class RLFont {
  static default_font() {
    if (RLFont['_default_font']) {
      return RLFont['_default_font'];
    }
    let canvas = RLFont['_multipurpose_context'].canvas;
    let ctx    = RLFont['_multipurpose_context'];
    canvas.width  = 90;
    canvas.height = 90;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 90, 90);
    let x = 0;
    let y = 0;
    let chars = ' qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890@';
    let characters = {};
    ctx.fillStyle = 'white';
    ctx.font = '9px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      characters[chars[i]] = { x, y };
      ctx.fillText(chars[i], x + 2, y);
      x += 10;
      if (x >= 90) {
        x = 0;
        y += 10;
      }
    }
    let data = ctx.getImageData(0, 0, 90, 90);
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i] >= 128) {
        data.data[i + 0] = 255;
        data.data[i + 1] = 255;
        data.data[i + 2] = 255;
      } else {
        data.data[i + 0] = 0;
        data.data[i + 1] = 0;
        data.data[i + 2] = 0;
      }
    }
    ctx.putImageData(data, 0, 0);
    let image = new Image();
    image.src = canvas.toDataURL();
    return RLFont['_default_font'] = new RLFont(10, 10, image, characters);
  }
  
  constructor(char_w, char_h, image, characters) {
    this.char_w = char_w;
    this.char_h = char_h;
    this.image  = image;
    this.images = {};
    this.characters = characters;
    this.image.addEventListener('load', () => this.images = {}); // recreate images once font is loaded
  }
  
  draw_char(ctx, c, x, y, color = 0xFF_FF_FF) {
    if (!this.images[color]) {
      let ctx = RLFont['_multipurpose_context'];
      let canvas = ctx.canvas;
      canvas.width  = this.image.width;
      canvas.height = this.image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(this.image, 0, 0);
      let data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i + 2] >= 128) {
          data.data[i + 0] = (color & 0xFF_00_00) >> 16;
          data.data[i + 1] = (color & 0xFF_00) >> 8;
          data.data[i + 2] = color & 0xFF;
          data.data[i + 3] = 255;
        } else {
          data.data[i + 0] = 0;
          data.data[i + 1] = 0;
          data.data[i + 2] = 0;
          data.data[i + 3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      this.images[color] = new Image();
      this.images[color].src = canvas.toDataURL();
    }
    ctx.drawImage(this.images[color], this.characters[c].x, this.characters[c].y, this.char_w, this.char_h, x, y, this.char_w, this.char_h);
  }
}

RLFont['_multipurpose_context'] = (() => {
  let canvas = document.createElement('canvas');
  canvas.innerText = 'hi! this canvas is normally outside of the window bounds, so you can\'t see it. it\'s used for font operations (generating images for each color, ...)';
  document.body.appendChild(canvas);
  canvas.style.position = 'fixed';
  canvas.style.left = '100vw';
  canvas.style.top  = '100vh';
  return canvas.getContext('2d');
})();
