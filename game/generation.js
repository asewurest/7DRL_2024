export function generate({ wall, floors, door: door_mtl, x: start_x, y: start_y }) {
    let rooms = [
        {
            x1: 0,
            y1: 0,
            x2: 99,
            y2: 99,
            partitionable: true,
        }
    ];
    let finished = [];
    let it = 0;
    for (let i = 0; i < rooms.length; i++) {
        // if (it++ > 1) {
        //     finished.push(rooms[i]);
        //     continue;
        // };
        let room = rooms[i];
        let w = room.x2 - room.x1;
        let h = room.y2 - room.y1;
        let area = w * h;
        let score = Math.random() * area;
        if (score <= 80) {
            finished.push(room);
            rooms.splice(i--, 1);
            continue;
        }
        let one, two;
        if (w > h) {
            let point = room.x1 + Math.round(w * (Math.random() / 2 + 0.25));
            one = {
                x1: room.x1,
                x2: point,
                y1: room.y1,
                y2: room.y2,
            };
            two = {
                x1: point,
                x2: room.x2,
                y1: room.y1,
                y2: room.y2,
            };
        } else {
            let point = room.y1 + Math.round(h * (Math.random() / 2 + 0.25));
            one = {
                x1: room.x1,
                x2: room.x2,
                
                y1: room.y1,
                y2: point,
            };
            two = {
                x1: room.x1,
                x2: room.x2,
                
                y1: point,
                y2: room.y2,
            };
        }
        for (let room of [one, two]) {
            if ((room.x2 - room.x1) > 2 && (room.y2 - room.y1) > 2) {
                rooms.push(room);
                console.log('continue');
            } else {
                /// and no more shall we part
                finished.push(room);
                console.log('keep');
            }
        }
    }
    let canvas = document.createElement('canvas');
    canvas.width = 102;
    canvas.height = 102;
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    let ctx = canvas.getContext('2d');
    ctx.translate(1, 1);
    ctx.strokeStyle = 'red';
    
    for (let i = 0; i < finished.length; i++) {
        let room = finished[i];
        room.adjacent = [];
        for (let j = 0; j < finished.length; j++) {
            if (i != j) {
                let other = finished[j];
                if (room.x1 == other.x2 || room.x2 == other.x1) {
                    let x = room.x1 == other.x2 ? room.x1 : room.x2;
                    let intersect = {
                        x1: x,
                        x2: x,
                        y1: Math.max(room.y1, other.y1),
                        y2: Math.min(room.y2, other.y2),
                        other,
                        doors: [],
                    };
                    if (intersect.y2 - intersect.y1 > 0) {
                        room.adjacent.push(intersect);
                    }
                } else if (room.y1 == other.y2 || room.y2 == other.y1) {
                    let y = room.y1 == other.y2 ? room.y1 : room.y2;
                    let intersect = {
                        y1: y,
                        y2: y,
                        x1: Math.max(room.x1, other.x1),
                        x2: Math.min(room.x2, other.x2),
                        other,
                        doors: [],
                    };
                    if (intersect.x2 - intersect.x1 > 0) {
                        room.adjacent.push(intersect);
                    }
                }
            }
        }
    }
    
    document.body.appendChild(canvas);
    console.log(finished.find(x => x.x1 <= start_x && x.x2 >= start_x && x.y1 <= start_y && x.y2 >= start_y));
    
    let targets = finished.filter(x => !(x.x1 == 0 || x.y1 == 0));
    let target_room = targets[Math.floor(Math.random() * targets.length)];
    let current = finished.find(x => x.x1 <= start_x && x.x2 >= start_x && x.y1 <= start_y && x.y2 >= start_y);
    if (!current) throw ['failed to find current room', start_x, start_y, finished];
    /// random walk until we get there
    while (current != target_room) {
        current.walked = true;
        let the_one = current.adjacent[Math.floor(Math.random() * current.adjacent.length)];
        let door = { x: the_one.x1 + 1 + Math.floor(Math.random() * (the_one.x2 - the_one.x1 - 2)), y: the_one.y1 + 1 + Math.floor(Math.random() * (the_one.y2 - the_one.y1 - 2)) };
        door.x = Math.max(Math.min(door.x, the_one.x2), the_one.x1);
        door.y = Math.max(Math.min(door.y, the_one.y2), the_one.y1);
        let length = Math.max(the_one.x2 - the_one.x1, the_one.y2 - the_one.y1);
        if (the_one.doors.length < Math.max(1, Math.floor(length / 3))) {
            the_one.doors.push(door);
            the_one.other.adjacent.find(x => x.other == current).doors.push(door);
        }
        current = the_one.other;
    }
    current.walked = true;
    
    for (let room of finished) {
        ctx.strokeStyle = room == target_room ? 'yellow' : 'red';
        // console.log(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
        ctx.strokeRect(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
    }
    ctx.fillStyle = 'green';
    for (let room of finished) {
        for (let adjacent of room.adjacent) {
            // ctx.strokeStyle = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
            // console.log(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
            for (let door of adjacent.doors) {
                ctx.fillRect(door.x, door.y, 1, 1);
            }
        }
    }
    
    let foreground = Array(100).fill(0).map(_ => {
        return Array(100).fill(null)
    });
    let background = Array(100).fill(0).map(_ => {
        return Array(100).fill(floors.floor0)
    });
    for (let room of finished) {
        for (let i = room.x1; i <= room.x2; i++) {
            foreground[i][room.y1] = wall;
            foreground[i][room.y2] = wall;
        }
        for (let j = room.y1; j <= room.y2; j++) {
            foreground[room.x1][j] = wall;
            foreground[room.x2][j] = wall;
        }
        let floor_type = floors[`floor${Math.floor(Math.random() * 3)}`];
        for (let i = room.x1; i <= room.x2; i++) {
            for (let j = room.y1; j <= room.y2; j++) {
                background[i][j] = floor_type;
            }
        }
    }
    for (let room of finished) {
        for (let adjacent of room.adjacent) {
            // ctx.strokeStyle = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
            // console.log(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
            for (let door of adjacent.doors) {
                foreground[door.x][door.y] = door_mtl;
            }
        }
    }
    return {
        background,
        foreground,
    }
}
