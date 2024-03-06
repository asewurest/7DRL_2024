export function find_path(self, target_x, target_y, rec = 0) {
    const UNKNOWN = 0;
    const NORMAL = 1;
    const WALL = 2;
    const NOTHING = 3;
    const DOORLIKE = 4;

    function h(node, x2, y2) {
        return Math.abs(node.x - x2) + Math.abs(node.y - y2);
    }

    if (!self.current_level) {
        console.warn('entity', self, 'seems to be in the Great Nowhere');
        return [];
    }
    self.pathfinding_data = self.pathfinding_data || {
        maps: {},
    };
    self.pathfinding_data.target_x = target_x;
    self.pathfinding_data.target_y = target_y;
    let key = self.current_level.name;
    let memory = self.memory_map[key];
    if (!memory) {
        console.warn('no memory :(');
        return [];
    }
    let level = self.current_level;

    let map;
    if (!self.pathfinding_data.maps[key]) {
        self.pathfinding_data.maps[key] = map = Array(level.w).fill(0).map((_, x) => Array(level.h).fill(0).map((_, y) => {
            return {
                parent: null,
                x,
                y,
                neighbors: [],
                g: Infinity,
                f: Infinity,
            };
        }));
        for (let i = 0; i < level.w; i++) {
            for (let j = 0; j < level.h; j++) {
                if (i != 0) map[i][j].neighbors.push(map[i - 1][j]);
                if (i != level.w - 1) map[i][j].neighbors.push(map[i + 1][j]);
                if (j != 0) map[i][j].neighbors.push(map[i][j - 1]);
                if (j != level.h - 1) map[i][j].neighbors.push(map[i][j + 1]);
            }
        }
    } else {
        map = self.pathfinding_data.maps[key];
        for (let i = 0; i < level.w; i++) {
            for (let j = 0; j < level.h; j++) {
                let node = map[i][j];
                node.parent = null;
                node.g = Infinity;
                node.f = Infinity;
            }
        }
    }

    function backtrace(node) {
        let path = [node];
        while (node.parent) {
            node = node.parent;
            path.unshift(node);
        }
        return path;
    }

    let start = map[self.x][self.y];
    start.g = 0;
    start.f = h(start, target_x, target_y);
    let open_set = [start];

    while (open_set.length > 0) {
        open_set = open_set.sort((a, b) => a.f - b.f);
        let current = open_set[0];

        if (current.x == target_x && current.y == target_y) {
            return backtrace(current);
        }

        open_set.shift();
        for (let neighbor of current.neighbors) {
            let index = neighbor.y * level.w + neighbor.x;
            let blocks = memory[index] == WALL || memory[index] == UNKNOWN || (memory[index] == NORMAL && level.foreground[neighbor.x][neighbor.y]?.spec.tangible);
            if (blocks) continue;
            let new_g = current.g + (blocks ? 1 : 20_000);
            if (new_g < neighbor.g) {
                neighbor.parent = current;
                neighbor.g = new_g;
                neighbor.f = h(neighbor, target_x, target_y);
                if (!open_set.includes(neighbor)) {
                    open_set.push(neighbor);
                }
            }
        }
    }

    // hmm, didn't get there.
    // console.log('Secondary Target Program started')
    for (let i = 0; i < level.w; i++) {
        for (let j = 0; j < level.h; j++) {
            let node = map[i][j];
            node.parent = null;
            node.g = Infinity;
            node.f = Infinity;
        }
    }
    let potential_targets = self.pathfinding_data.maps[key].flat().filter(x => [NORMAL, NOTHING, DOORLIKE].includes(memory[x.y * level.w + x.x]) && !(level.foreground[x.x][x.y]?.spec.tangible) && x.neighbors.some(n => memory[n.y * level.w + n.x] == UNKNOWN));
    if (potential_targets.length == 0) {
        console.warn('nowhere to go', target_x, target_y, self);
        return [];
    }
    potential_targets = potential_targets.sort((a, b) => h(a, self.x, self.y) - h(b, self.x, self.y));
    target_x = potential_targets[0].x;
    target_y = potential_targets[0].y;
    // console.log(potential_targets);

    {
        let start = map[self.x][self.y];
        start.g = 0;
        start.f = h(start, target_x, target_y);
        let open_set = [start];

        while (open_set.length > 0) {
            open_set = open_set.sort((a, b) => a.f - b.f);
            let current = open_set[0];

            if (current.x == target_x && current.y == target_y) {
                return backtrace(current);
            }

            open_set.shift();
            for (let neighbor of current.neighbors) {
                let index = neighbor.y * level.w + neighbor.x;
                let blocks = memory[index] == WALL || memory[index] == UNKNOWN || (memory[index] == NORMAL && level.foreground[neighbor.x][neighbor.y]?.spec.tangible);
            if (blocks) continue;
            let new_g = current.g + (blocks ? 1 : 20_000);
                if (new_g < neighbor.g) {
                    neighbor.parent = current;
                    neighbor.g = new_g;
                    neighbor.f = h(neighbor, target_x, target_y);
                    if (!open_set.includes(neighbor)) {
                        open_set.push(neighbor);
                    }
                }
            }
        }
    }
    console.error('oh no, oh no, oh no!');
    return [];
}