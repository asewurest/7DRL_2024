function canvas_color(c) {
    return '#' + c.toString(16).padEnd(6, '0');
}

function map_key(k) {
    switch (k) {
        case 'ArrowLeft':
        case 'arrowleft':
        return '←';
        case 'ArrowRight':
        case 'arrowright':
        return '→';
        case 'ArrowUp':
        case 'arrowup':
        return '↑';
        case 'ArrowDown':
        case 'arrowdown':
        return '↓';
        default:
        return k;
    }
}

export class RL {
    constructor(options) {
        let {
            rows,
            cols,
            font,
            c,
            background,
            scale,
            unload_hidden
        } = (options || {});
        font       = font       || RLFont.default_font();
        rows       = rows       || 25;
        cols       = cols       || 80;
        scale      = scale      || 1;
        background = background || 0x000000;
        if (typeof unload_hidden === 'undefined') {
            unload_hidden = true;
        }
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
        /** @type {boolean} */
        this.unload_hidden = unload_hidden;
        if (c instanceof CanvasRenderingContext2D) {
            this.canvas = c.canvas;
            this.ctx = c;
        } else if (c instanceof HTMLCanvasElement) {
            this.canvas = c;
            this.ctx = c.getContext('2d');
        } else {
            this.canvas = document.createElement('canvas');
            this.ctx    = this.canvas.getContext('2d');
            this.canvas.width  = this.pixel_width;
            this.canvas.height = this.pixel_height;
        }

        this.ctx.imageSmoothingEnabled = false;

        this.loggers = [];
        this.action_panels = [];

        this.pressed = {};
        this.pressed_now = {};

        addEventListener('keydown', e => {
            this.pressed[e.key]     = true;
            this.pressed_now[e.key] = true;
        });

        addEventListener('keyup', e => {
            this.pressed[e.key] = false;
        });

        // this.entities = [];
        this.materials = {};
        this.material_id = 0;

        this.listeners = {};

        this.levels = {};
        this.current_level = 0;
        this.level_order = [];
        this.viewports = [];
    }

    on(event, handler, options) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push([handler, (options && (options.once == true)) ? 1 : Infinity]);
    }

    off(event, handler, options) {
        if (this.listeners[event]) {
            let once = options && (options.once == true);
            let element = this.listeners[event].find(x => x[0] == handler && isFinite(x[1]) == once);
            if (element) {
                this.listeners[event].splice(this.listeners.indexOf(element), 1);
            }
        }
    }

    trigger(event, value) {
        let returned = [];
        if (this.listeners[event]) {
            for (let listener of this.listeners[event]) {
                returned.push(listener[0](value));
                // console.log(event, listener);
                listener[1]--;
            }
            // console.log('pre', this.listeners[event]);
            this.listeners[event] = this.listeners[event].filter(x => x[1] > 0);
            // console.log('post', this.listeners[event]);
        }
        return returned;
    }

    material(name, spec) {
        spec.material_id = this.material_id++;
        spec.character = spec.character || '#';
        spec.tangible = (typeof spec.tangible === 'undefined') ? true : spec.tangible;
        spec.shaping = spec.shaping || false;
        spec.color = spec.color || 0xAA_AA_AA;
        if (spec.shaping == 'wall_thin') {
            // ┌┐└┘│|─┤├┼┬┴╔╗╚╝║═╣╠╬╦╩#╴╶╵╷╡╞╨╥
            spec.shaping = {
                'default': '─',
                0b1111: '┼',
                0b1001: '│',
                0b0110: '─',
                0b1100: '┘',
                0b0011: '┌',
                0b1010: '└',
                0b0101: '┐',
                0b1101: '┤',
                0b1011: '├',
                0b0111: '┬',
                0b1110: '┴',
                0b1000: '╵',
                0b0001: '╷',
                0b0100: '╴',
                0b0010: '╶',
                compatible: [spec],
            }
        }
        if (spec.shaping == 'wall_thick' || spec.shaping == 'wall') {
            // ┌┐└┘│|─┤├┼┬┴╔╗╚╝║═╣╠╬╦╩#╴╶╵╷╡╞╨╥
            spec.shaping = {
                'default': '═',
                0b1111: '╬',
                0b1001: '║',
                0b0110: '═',
                0b1100: '╝',
                0b0011: '╔',
                0b1010: '╚',
                0b0101: '╗',
                0b1101: '╣',
                0b1011: '╠',
                0b0111: '╦',
                0b1110: '╩',
                0b1000: '╨',
                0b0001: '╥',
                0b0100: '╡',
                0b0010: '╞',
                compatible: [spec],
            }
        }
        if (spec.shaping && !spec.shaping.compatible.includes(spec)) {
            spec.shaping.compatible.push(spec);
        }
        this.materials[name] = spec;
        return spec;
    }

    log(message, color) {
        if (this.default_logger) {
            this.default_logger.log(message, color);
        }
    }
    
    viewport(x, y, w, h, { current_level, target_x, target_y, tracking } = {}) {
        let viewport = {
            x,
            y,
            w,
            h,
            current_level : current_level || 0,
            target_x      : target_x      || 0,
            target_y      : target_y      || 0,
            tracking      : tracking      || null,
            remove: () => {
                if (this.viewports.includes(viewport)) {
                    this.viewports.slice(this.viewports.indexOf(viewport), 1);
                }
            }
        };
        this.viewports.push(viewport);
        return viewport;
    }

    action_panel(x, y, w, h) {
        let action_panel = {
            x,
            y,
            w,
            h,
            actions: {},
            order: [],
            remove: () => {
                if (this.action_panels.includes(action_panel)) {
                    this.action_panels.splice(this.action_panels.indexOf(action_panel), 1);
                }
            },
            add_action: (name, label, key, action) => {
                action_panel.actions[name] = {
                    label,
                    key,
                    action,
                };
                action_panel.order.push(name);
            },
            remove_action: name => {
                if (action_panel.order.includes(name)) {
                    action_panel.order.splice(action_panel.order.indexOf(name), 1);
                }
                delete action_panel.actions[name];
            }
        };
        this.action_panels.push(action_panel);
        return action_panel;
    }

    logger(x, y, w, h, is_default = false) {
        let logger = {
            x,
            y,
            w,
            h,
            lines: [],
            clear: () => logger.lines = [],
            log: (message, color = 0xFF_FF_FF) => {
                message = message.slice(0, w);
                if (logger.lines.length > 0 && logger.lines[logger.lines.length - 1][0] == message && logger.lines[logger.lines.length - 1][1] == color) {
                    logger.lines[logger.lines.length - 1][3]++;
                    logger.lines[logger.lines.length - 1][2] = `(${logger.lines[logger.lines.length - 1][3]}) `;
                } else {
                    logger.lines.push([message, color, '', 1]);
                    if (logger.lines.length > h) logger.lines.shift();
                }
            },
            remove: () => {
                if (this.loggers.includes(logger)) {
                    this.loggers.splice(this.loggers.indexOf(logger), 1);
                }
            }
        };

        this.loggers.push(logger);
        if (is_default) {
            this.default_logger = logger;
        }
        return logger;
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

    start_entity_move_requests() {
        this.entity_moves = pollable(Promise.all(this.level_order.map(x => Promise.all(this.levels[x].entities.map(x => x.get_next_moves())))));
    }
    
    post_process_level(level) {
        level.entities.forEach(x => x.planned_movement = { x: 0, y: 0 });
        for (let property of ['foreground', 'background']) {
            let array = level[property];
            function tile(x, y) {
                if (array[x] && array[x][y]) return array[x][y].spec;
                return null;
            }
            for (let i = 0; i < level.w; i++) {
                for (let j = 0; j < level.h; j++) {
                    array[i][j] = array[i][j] && { spec: array[i][j], character: array[i][j].character };
                }
            }
            for (let i = 0; i < level.w; i++) {
                for (let j = 0; j < level.h; j++) {
                    if (array[i][j] != null && array[i][j].spec.shaping) {
                        let top    = array[i][j].spec.shaping.compatible.includes(tile(i, j - 1)) ? 1 : 0;
                        let left   = array[i][j].spec.shaping.compatible.includes(tile(i - 1, j)) ? 1 : 0;
                        let right  = array[i][j].spec.shaping.compatible.includes(tile(i + 1, j)) ? 1 : 0;
                        let bottom = array[i][j].spec.shaping.compatible.includes(tile(i, j + 1)) ? 1 : 0;
                        let key = bottom | (right << 1) | (left << 2) | (top << 3);
                        array[i][j].character = array[i][j].spec.shaping[key] || array[i][j].spec.shaping['default'];
                    }
                }
            }
        }
    }

    update() {
        for (let viewport of this.viewports) {
            if (!this.levels[viewport.current_level]) {
                let response = this.trigger('load_level', viewport.current_level);
                // console.log(response);
                if (response.length == 0) {
                    throw new Error('rl.js: no `load_level` listeners found. consider adding one to generate levels when needed.');
                }
                if (response.length > 1) {
                    console.warn('rl.js: multiple possibilities have been received for level=', viewport.current_level, 'choosing a random one');
                    response = response.sort(() => Math.random() - 0.5);
                }
                this.levels[viewport.current_level] = response[0];
                if (!this.levels[viewport.current_level]) {
                    console.warn('rl.js: `load_level` handler returned', this.levels[viewport.current_level], 'which is falsey and probably invalid');
                    this.levels[viewport.current_level] = 1;
                }
                this.levels[viewport.current_level].entities = this.levels[viewport.current_level].entities || [];
                this.level_order.push(viewport.current_level);
                this.post_process_level(this.levels[viewport.current_level]);
            }
        }
        let now = performance.now();
        const delta = (now - this.then) / 1000;
        this.then = now;
        const ctx = this.ctx;
        const old_matrix = ctx.getTransform();
        if (this.entity_moves) {
            if (this.entity_moves.resolved) {
                let result = this.entity_moves.output;
                // <tick-end-stuff like="moving entities, checking which ones would die">
                for (let i = 0; i < result.length; i++) {
                    let level = this.levels[this.level_order[i]];
                    for (let j = 0; j < result[i].length; j++) {
                        let entity = level.entities[j];
                        entity.planned_movement.x = 0;
                        entity.planned_movement.y = 0;
                        let moves  = result[i][j];
                        for (let move of moves) {
                            if (move.kind == 'move') {
                                entity.planned_movement.x += move.x;
                                entity.planned_movement.y += move.y;
                            }
                        }
                    }
                }
                for (let level of this.level_order.map(x => this.levels[x])) {
                    for (let j = 0; j < level.entities.length; j++) {
                        let entity = level.entities[j];
                        let original_x = entity.x;
                        let original_y = entity.y;
                        entity.x += entity.planned_movement.x;
                        entity.y += entity.planned_movement.y;
                        if (entity.x < 0) entity.x = 0;
                        if (entity.y < 0) entity.y = 0;
                        if (entity.x >= level.w) entity.x = level.w - 1;
                        if (entity.y >= level.h) entity.y = level.h - 1;
                        if (level.foreground[entity.x][entity.y]?.spec.tangible) {
                            entity.x = original_x;
                            entity.y = original_y;
                        }
                    }
                }
                // <frame-end-stuff/>
                this.trigger('tick_end', undefined);
                this.start_entity_move_requests();
            }
        } else {
            this.start_entity_move_requests();
        }

        ctx.fillStyle = canvas_color(this.background);
        ctx.fillRect(0, 0, this.pixel_width, this.pixel_height);

        ctx.scale(this.scale, this.scale);

        // for (let i = this.rows; i < this.rows * this.cols; i++) {
        //     this.font.draw_char(ctx, 'A', 10 * (i % this.rows), 10 * Math.floor(i / this.rows), (i % 10) * 5329099);
        // }

        ctx.fillStyle = canvas_color(this.background);
        this.viewports.forEach(viewport => {
            let level = this.levels[viewport.current_level];
            if (level.entities.includes(viewport.track)) {
                viewport.target_x = viewport.track.x;
                viewport.target_y = viewport.track.y;
            }
            ctx.fillRect(viewport.x * 10, viewport.y * 10, viewport.w * 10, viewport.h * 10);
            let off_x  = Math.floor(viewport.w / 2);
            let off_y  = Math.floor(viewport.h / 2);
            let left   = -Math.floor(viewport.w / 2);
            let right  = viewport.w + left;
            let top    = -Math.floor(viewport.h / 2);
            let bottom = viewport.h + top;
            left   = Math.max(0, left + viewport.target_x);
            right  = Math.min(level.w, right + viewport.target_x);
            top    = Math.max(0, top + viewport.target_y);
            bottom = Math.min(level.h, bottom + viewport.target_y);
            window._left = left;
            window._right = right;
            window._top = top;
            window._bottom = bottom;
            for (let x = left; x < right; x++) {
                for (let y = top; y < bottom; y++) {
                    let anyone_here = level.entities.find(e => e.x == x && e.y == y);
                    let char;
                    let color = this.background;
                    let draw = true;
                    if (anyone_here) {
                        char  = anyone_here.character;
                        color = anyone_here.color;
                    } else if (level.foreground[x][y]) {
                        char  = level.foreground[x][y].character;
                        color = level.foreground[x][y].spec.color;
                    } else if (level.background[x][y]) {
                        char  = level.background[x][y].character;
                        color = level.background[x][y].spec.color;
                    } else {
                        draw = false;
                    }
                    if (draw) {
                        this.font.draw_char(ctx, char,  10 * (x + viewport.x + off_x - viewport.target_x), 10 * (y + viewport.y + off_y - viewport.target_y), color);
                    }
                }
            }
        });
        
        this.loggers.forEach(logger => {
            ctx.fillRect(logger.x * 10, logger.y * 10, logger.w * 10, logger.h * 10);
            for (let i = 0; i < logger.lines.length; i++) {
                let [message, color, repeat] = logger.lines[i];
                this.font.draw_text(ctx, (repeat + message).slice(0, logger.w), logger.x * 10, (logger.y + i) * 10, color);
            }
        });

        this.action_panels.forEach(action_panel => {
            ctx.fillRect(action_panel.x * 10, action_panel.y * 10, action_panel.w * 10, action_panel.h * 10);
            let i = -1;
            for (let v of action_panel.order) {
                let {
                    label,
                    key,
                    action
                } = action_panel.actions[v];
                if (key.toLowerCase() == label[0].toLowerCase()) {
                    this.font.draw_text(ctx, `${key}`, action_panel.x * 10, (action_panel.y + ++i) * 10, 0x00_FF_00);
                    this.font.draw_text(ctx, `${label.slice(1, action_panel.w)}`, (action_panel.x + 1) * 10, (action_panel.y + i) * 10, 0xCC_CC_CC);
                } else {
                    this.font.draw_text(ctx, `${map_key(key)}`, action_panel.x * 10, (action_panel.y + ++i) * 10, 0x00_FF_00);
                    this.font.draw_text(ctx, `${label.slice(0, action_panel.w - 1)}`, (action_panel.x + 2) * 10, (action_panel.y + i) * 10, 0xCC_CC_CC);
                }
                if (this.pressed_now[key]) {
                    action();
                }
            }
            // for (let i = 0; i < logger.lines.length; i++) {
            //   let [message, color, repeat] = logger.lines[i];
            //   this.font.draw_text(ctx, (repeat + message).slice(0, logger.w), logger.x * 10, (logger.y + i) * 10, color);
            // }
        });

        // ctx.fillStyle = 'white';
        // ctx.textAlign = 'left';
        // ctx.textBaseline = 'top';
        // ctx.scale(10, 10);
        // ctx.fillText(delta.toString(), 0, 0);

        ctx.setTransform(old_matrix);
        this.pressed_now = {};
        this.loop = requestAnimationFrame(() => this.update());
    }
}

function pollable(x) {
    if (!x.pollable) {
        x.pollable = true;
        x.then(v => {
            x.resolved = true;
            x.output = v;
        });
    }
    return x;
}

export class RLFont {
    static default_font() {
        if (RLFont['_default_font']) {
            return RLFont['_default_font'];
        }
        let canvas = RLFont['_multipurpose_context'].canvas;
        let ctx = RLFont['_multipurpose_context'];
        canvas.width = 90;
        canvas.height = 90;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 90, 90);
        let x = 0;
        let y = 0;
        let chars = ' qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890@!().,';
        let characters = {};
        ctx.fillStyle = 'white';
        ctx.font = '9px monospace';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        for (let i = 0; i < chars.length; i++) {
            characters[chars[i]] = {
                x,
                y
            };
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
        this.image = image;
        this.images = {};
        this.characters = characters;
        this.image.addEventListener('load', () => this.images = {}); // recreate images once font is loaded
    }

    draw_char(ctx, c, x, y, color = 0xFF_FF_FF) {
        c = c || '!';
        if (!this.images[color]) {
            let ctx = RLFont['_multipurpose_context'];
            let canvas = ctx.canvas;
            canvas.width = this.image.width;
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

    draw_text(ctx, text, x, y, color = 0xFF_FF_FF) {
        if (!this.images[color]) {
            let ctx = RLFont['_multipurpose_context'];
            let canvas = ctx.canvas;
            canvas.width = this.image.width;
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
        for (let i = 0; i < text.length; i++) {
            ctx.drawImage(this.images[color], this.characters[text[i]].x, this.characters[text[i]].y, this.char_w, this.char_h, x + i * this.char_w, y, this.char_w, this.char_h);
        }
    }
}

RLFont['_multipurpose_context'] = (() => {
    let canvas = document.createElement('canvas');
    canvas.innerText = 'hi! this canvas is normally outside of the window bounds, so you can\'t see it. it\'s used for font operations (generating images for each color, ...)';
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.left = '100vw';
    canvas.style.top = '100vh';
    return canvas.getContext('2d');
})();
