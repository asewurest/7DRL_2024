export const SIZE_X = 50;
export const SIZE_Y = 50;

export function generate({ wall, fake_wall, floors, door: door_mtl, x: start_x, y: start_y }) {
    let rooms = [
        {
            x1: 0,
            y1: 0,
            x2: SIZE_X - 1,
            y2: SIZE_Y - 1,
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
        if (score <= 80 && it++ != 0 && area < 300) {
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
                // console.log('continue');
            } else {
                /// and no more shall we part
                finished.push(room);
                // console.log('keep');
            }
        }
    }
    let canvas = document.createElement('canvas');
    canvas.width = SIZE_X + 2;
    canvas.height = SIZE_Y + 2;
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
                        y1: Math.max(room.y1, other.y1) + 1,
                        y2: Math.min(room.y2, other.y2) - 1,
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
                        x1: Math.max(room.x1, other.x1) + 1,
                        x2: Math.min(room.x2, other.x2) - 1,
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
    let source = finished.find(x => x.x1 <= start_x && x.x2 >= start_x && x.y1 <= start_y && x.y2 >= start_y);
    let current = source;
    if (!current) throw ['failed to find current room', start_x, start_y, finished];
    /// random walk until we get there
    while (current != target_room) {
        current.walked = true;
        let the_one = current.adjacent[Math.floor(Math.random() * current.adjacent.length)];
        let door = { x: the_one.x1 + Math.floor(Math.random() * (the_one.x2 - the_one.x1)), y: the_one.y1 + Math.floor(Math.random() * (the_one.y2 - the_one.y1)) };
        door.x = Math.max(Math.min(door.x, the_one.x2), the_one.x1);
        door.y = Math.max(Math.min(door.y, the_one.y2), the_one.y1);
        let length = Math.max(the_one.x2 - the_one.x1, the_one.y2 - the_one.y1);
        if (the_one.doors.length < Math.max(1, Math.floor(length / 5))) {
            the_one.doors.push(door);
            the_one.other.adjacent.find(x => x.other == current).doors.push(door);
        }
        current = the_one.other;
    }
    current.walked = true;
    
    while (true) {
        let walked = finished.filter(x => x.walked);
        let linked = walked.flatMap(x => x.adjacent.map(x => x.other).filter(x => !(x.walked || x.hidden)));
        if (linked.length == 0) break;
        for (let room of linked) {
            let parent_connection = room.adjacent.filter(x => x.other.walked);
            parent_connection = parent_connection[Math.floor(Math.random() * parent_connection.length)];
            if (typeof room.hidden === 'boolean') continue;
            let hidden = Math.random() > 0.8;
            if (!hidden && Math.random() > 0.6) {
                room.hidden = true;
                room.unreachable = true;
                continue; // unreachable rooms
            }
            room.hidden = hidden;
            room.walked = !hidden;
            let door = { hidden, x: parent_connection.x1 + Math.floor(Math.random() * (parent_connection.x2 - parent_connection.x1)), y: parent_connection.y1 + Math.floor(Math.random() * (parent_connection.y2 - parent_connection.y1)) };
            door.x = Math.max(Math.min(door.x, parent_connection.x2), parent_connection.x1);
            door.y = Math.max(Math.min(door.y, parent_connection.y2), parent_connection.y1);
            let length = Math.max(parent_connection.x2 - parent_connection.x1, parent_connection.y2 - parent_connection.y1);
            if (parent_connection.doors.length < Math.max(1, Math.floor(length / 5))) {
                parent_connection.doors.push(door);
                parent_connection.other.adjacent.find(x => x.other == room).doors.push(door);
            }
        }
    }
    
    for (let room of finished) {
        ctx.strokeStyle = room == target_room ? 'yellow' : (room.hidden ? 'blue' : 'red');
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
    
    let foreground = Array(SIZE_X).fill(0).map(_ => {
        return Array(SIZE_Y).fill(null)
    });
    let background = Array(SIZE_X).fill(0).map(_ => {
        return Array(SIZE_Y).fill(floors.floor0)
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
        let floor_type = `floor${Math.floor(Math.random() * 3)}`;
        if (room == target_room) {
            floor_type = 'floor_target';
        } else if (room == source) {
            floor_type = 'floor_source';
        } else if (room.unreachable) {
            floor_type = 'floor_unreachable';
        } else if (room.hidden) {
            floor_type = 'floor_hidden';
        }
        for (let i = room.x1; i <= room.x2; i++) {
            for (let j = room.y1; j <= room.y2; j++) {
                background[i][j] = floors[floor_type];
            }
        }
    }
    for (let room of finished) {
        for (let adjacent of room.adjacent) {
            // ctx.strokeStyle = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
            // console.log(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
            for (let door of adjacent.doors) {
                foreground[door.x][door.y] = door.hidden ? fake_wall : door_mtl;
            }
            // if (adjacent.x1 == adjacent.x2) {
            //     for (let y = adjacent.y1; y <= adjacent.y2; y++) {
            //         foreground[adjacent.x1][y] = fake_wall;
            //     }
            // } else {
                
            // }
        }
    }
    return {
        background,
        foreground,
    }
}
