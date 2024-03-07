(module
(import "memory" "mem" (memory 2))

(func $abs (param $x i32) (result i32) (local $mask i32)
    local.get $x
    local.get $x
    i32.const 31
    i32.shr_s
    local.tee $mask
    i32.xor
    local.get $mask
    i32.sub
)

(func $manhattan (param $x1 i32) (param $y1 i32) (param $x2 i32) (param $y2 i32) (result i32)
    local.get $x2
    local.get $x1
    i32.sub
    call $abs

    local.get $y2
    local.get $y1
    i32.sub
    call $abs

    i32.add
)

(func $init (local $addr i32)
    ;; open set
    i32.const 48384
    i32.const 48392
    i32.store
    i32.const 48388
    i32.const 0 ;; 0 elements
    i32.store
    i32.const 48392
    i32.const 0
    i32.store

    i32.const 3455
    local.set $addr

    (loop $the_loop
        local.get $addr
        i32.const 0
        i32.store

        local.get $addr
        i32.const 4
        i32.add
        i32.const 4294967295
        i32.store

        local.get $addr
        i32.const 8
        i32.add
        i32.const 4294967295
        i32.store

        local.get $addr
        i32.const 1
        i32.sub
        local.tee $addr
        br_if $the_loop
    )
)

(func $backtrack (param $path_loc i32) (param $ptr i32) (local $addr i32) (local $count i32)
    i32.const 1
    local.set $count
    ;; let path = [node];
    local.get $path_loc
    i32.const 4
    i32.add
    local.get $ptr
    i32.const 6912
    i32.sub
    i32.const 12
    i32.div_u
    i32.store

    local.get $ptr
    i32.load

    (if
        (then
            ;; while (node.parent) {
            (loop $non_null
                ;; ptr = *ptr;
                local.get $ptr
                i32.load
                local.set $ptr

                ;; store this new thing
                local.get $path_loc
                local.get $count
                i32.const 4
                i32.mul
                i32.add
                local.get $ptr
                i32.const 6912
                i32.sub
                i32.const 12
                i32.div_u
                i32.store

                ;; increase the count
                local.get $count
                i32.const 1
                i32.add
                local.set $count

                local.get $ptr
                br_if $non_null
            )

            ;; store length
            local.get $path_loc
            local.get $count
            i32.store
        )
        (else
            ;; store length = 1
            local.get $path_loc
            i32.const 1
            i32.store
        )
    )
)

(func $open_set_insert_if_absent (param $ptr i32) (local $cursor i32) (local $current_addr i32)
    i32.const 48392
    local.set $cursor
    (loop $search
        local.get $cursor
        i32.load
        local.tee $current_addr
        (if
            (then
                local.get $cursor
                i32.const 4
                i32.add
                local.set $cursor
                local.get $current_addr
                local.get $ptr
                i32.eq
                (if
                    (then
                        return
                    )
                )
                br $search
            )
        )
    )
    local.get $ptr
    call $open_set_add
)

(func $open_set_add (param $ptr i32) (local $end i32) (local $zero i32)
    i32.const 48384
    i32.load
    local.tee $end
    i32.const 4
    i32.add
    local.tee $zero
    i32.const 48384
    i32.store
    local.get $end
    local.get $ptr
    i32.store
    i32.const 48388
    i32.const 48388
    i32.load
    i32.const 1
    i32.add
    i32.store
    local.get $zero
    i32.const 0
    i32.store
)

(func $extract_xy (param $in i32) (result (; x ;) i32 (; y ;) i32)
    local.get $in
    i32.const 64
    i32.rem_u ;; x
    local.get $in
    i32.const 64
    i32.div_u
)

;; call $init before this
(func $find_path_impl (param $x i32) (param $y i32) (param $tx i32) (param $ty i32) (param $path_loc i32) (result i32) (local $current_addr i32) (local $cursor i32) (local $best i32) (local $best_addr i32) (local $this_fscore i32) (local $openset_pos i32)
    ;; so...
    ;; terrain is 64x54 (3456)
    ;; memory @ 0     -> solidity map (1 byte each)
    ;; memory @ 3456  -> memory map (1 byte each)
    ;; memory @ 6912  -> pathfinding data (parent: i32(addr); g: i32; f: i32 -> 12 bytes each)
    ;; memory @ 48384 -> where the open set resides (pointer to end)
    ;; memory @ 48388 -> where the open set resides (true count, used to see how much is left)
    ;; memory @ 48392 -> where the open set resides (elements)
    ;; memory @ $path_loc -> path length
    ;; memory @ $path_loc + 4 -> path elements, in reverse
    ;; max i32 value = 4294967295
    ;; OPEN SET SPECIAL VALUES
    ;; 0 => end
    ;; 1 => skip

    local.get $y
    i32.const 64
    i32.mul
    local.get $x
    i32.add
    i32.const 12
    i32.mul
    i32.const 6912
    i32.add
    local.tee $current_addr
    i32.const 4
    i32.add
    i32.const 0
    i32.store
    local.get $current_addr
    i32.const 8
    i32.add
    local.get $x
    local.get $y
    local.get $tx
    local.get $ty
    call $manhattan
    i32.store
    
    ;; let open_set = [start];
    local.get $current_addr
    call $open_set_add

    (loop $loop
        i32.const 4294967295
        local.set $best
        i32.const 48392
        local.set $cursor
        (loop $search
            local.get $cursor
            i32.load
            local.tee $current_addr ;; local reuse!
            (if
                (then
                    local.get $cursor
                    i32.const 4
                    i32.add
                    local.set $cursor
                    local.get $current_addr
                    i32.const 1
                    i32.eq
                    br_if $search ;; continue
                    local.get $current_addr
                    i32.const 8
                    i32.add
                    i32.load ;; load f score
                    local.tee $this_fscore
                    local.get $best
                    i32.lt_u
                    (if
                        (then
                            local.get $this_fscore
                            local.set $best
                            local.get $current_addr
                            local.set $best_addr
                            local.get $cursor
                            local.set $openset_pos
                        )
                    )
                    br $search
                )
            )
        )

        ;; remove from open set
        local.get $openset_pos
        i32.const 1
        i32.store
        i32.const 48388
        i32.const 48388
        i32.load
        i32.const 1
        i32.sub
        i32.store

        local.get $best_addr
        local.set $current_addr

        ;; are we there?
        ;; (repurposing cursor as storage for the y coordinate, and best for the x)
        local.get $current_addr
        i32.const 6912
        i32.sub
        i32.const 12
        i32.div_u
        call $extract_xy
        local.set $cursor ;; y
        local.tee $best   ;; x
        local.get $x
        i32.eq
        (if
            (then
                local.get $cursor
                local.get $y
                i32.eq
                (if
                    (then
                        local.get $path_loc
                        local.get $current_addr
                        call $backtrack
                        i32.const 1
                        return
                    )
                )
            )
        )

        ;; neighbor: up
        local.get $cursor ;; y
        i32.const 0
        i32.ne
        (if
            (then
                local.get $cursor ;; y
                i32.const 1
                i32.sub ;; (0, -1) relative to the current one
                i32.const 64
                i32.mul
                local.get $best ;; x
                i32.add
                ;; repurposing best_addr as storage for the index
                local.tee $best_addr
                i32.const 3456
                i32.add
                i32.load8_u
                ;; repurposing this_fscore as memory[index]
                local.tee $this_fscore
                i32.const 2
                i32.eq
                local.get $this_fscore
                i32.eqz
                local.get $this_fscore
                i32.const 1
                i32.eq
                local.get $best_addr
                i32.load8_u
                i32.const 0
                i32.ne
                i32.and
                i32.or
                i32.or
                i32.eqz ;; is it false?
                (if
                    (then
                        ;; new g score
                        local.get $current_addr
                        i32.const 4
                        i32.add
                        i32.load
                        i32.const 1
                        i32.add
                        ;; the plan is foiled, f is actually g
                        ;; (2nd repurposing of this_fscore)
                        local.set $this_fscore
                        local.get $best_addr
                        i32.const 12
                        i32.mul
                        i32.const 6912
                        i32.add
                        ;; repurposing again: best_addr -> address of the neighbor
                        local.tee $best_addr
                        i32.const 4
                        i32.add
                        local.get $this_fscore
                        i32.store

                        ;; set parent
                        local.get $best_addr
                        local.get $current_addr
                        i32.store

                        local.get $best_addr
                        i32.const 8
                        i32.add
                        local.get $tx
                        local.get $ty
                        local.get $best ;; x
                        local.get $cursor ;; y
                        i32.const 1
                        i32.sub
                        call $manhattan
                        i32.store

                        local.get $best_addr
                        call $open_set_insert_if_absent
                    )
                )
            )
        )

        ;; neighbor: down
        local.get $cursor ;; y
        i32.const 53
        i32.ne
        (if
            (then
                local.get $cursor ;; y
                i32.const 1
                i32.add ;; (0, 1) relative to the current one
                i32.const 64
                i32.mul
                local.get $best ;; x
                i32.add
                ;; repurposing best_addr as storage for the index
                local.tee $best_addr
                i32.const 3456
                i32.add
                i32.load8_u
                ;; repurposing this_fscore as memory[index]
                local.tee $this_fscore
                i32.const 2
                i32.eq
                local.get $this_fscore
                i32.eqz
                local.get $this_fscore
                i32.const 1
                i32.eq
                local.get $best_addr
                i32.load8_u
                i32.const 0
                i32.ne
                i32.and
                i32.or
                i32.or
                i32.eqz ;; is it false?
                (if
                    (then
                        ;; new g score
                        local.get $current_addr
                        i32.const 4
                        i32.add
                        i32.load
                        i32.const 1
                        i32.add
                        ;; the plan is foiled, f is actually g
                        ;; (2nd repurposing of this_fscore)
                        local.set $this_fscore
                        local.get $best_addr
                        i32.const 12
                        i32.mul
                        i32.const 6912
                        i32.add
                        ;; repurposing again: best_addr -> address of the neighbor
                        local.tee $best_addr
                        i32.const 4
                        i32.add
                        local.get $this_fscore
                        i32.store

                        ;; set parent
                        local.get $best_addr
                        local.get $current_addr
                        i32.store

                        local.get $best_addr
                        i32.const 8
                        i32.add
                        local.get $tx
                        local.get $ty
                        local.get $best ;; x
                        local.get $cursor ;; y
                        i32.const 1
                        i32.add
                        call $manhattan
                        i32.store

                        local.get $best_addr
                        call $open_set_insert_if_absent
                    )
                )
            )
        )

        ;; neighbor: left
        local.get $best ;; x
        i32.const 0
        i32.ne
        (if
            (then
                local.get $cursor ;; y
                i32.const 64
                i32.mul
                local.get $best ;; x
                i32.const 1 ;; (-1, 0) relative to current
                i32.sub
                i32.add
                ;; repurposing best_addr as storage for the index
                local.tee $best_addr
                i32.const 3456
                i32.add
                i32.load8_u
                ;; repurposing this_fscore as memory[index]
                local.tee $this_fscore
                i32.const 2
                i32.eq
                local.get $this_fscore
                i32.eqz
                local.get $this_fscore
                i32.const 1
                i32.eq
                local.get $best_addr
                i32.load8_u
                i32.const 0
                i32.ne
                i32.and
                i32.or
                i32.or
                i32.eqz ;; is it false?
                (if
                    (then
                        ;; new g score
                        local.get $current_addr
                        i32.const 4
                        i32.add
                        i32.load
                        i32.const 1
                        i32.add
                        ;; the plan is foiled, f is actually g
                        ;; (2nd repurposing of this_fscore)
                        local.set $this_fscore
                        local.get $best_addr
                        i32.const 12
                        i32.mul
                        i32.const 6912
                        i32.add
                        ;; repurposing again: best_addr -> address of the neighbor
                        local.tee $best_addr
                        i32.const 4
                        i32.add
                        local.get $this_fscore
                        i32.store

                        ;; set parent
                        local.get $best_addr
                        local.get $current_addr
                        i32.store

                        local.get $best_addr
                        i32.const 8
                        i32.add
                        local.get $tx
                        local.get $ty
                        local.get $best ;; x
                        i32.const 1
                        i32.sub
                        local.get $cursor ;; y
                        call $manhattan
                        i32.store

                        local.get $best_addr
                        call $open_set_insert_if_absent
                    )
                )
            )
        )

        ;; neighbor: right
        local.get $best ;; x
        i32.const 63
        i32.ne
        (if
            (then
                local.get $cursor ;; y
                i32.const 64
                i32.mul
                local.get $best ;; x
                i32.const 1 ;; (1, 0) relative to current
                i32.add
                i32.add
                ;; repurposing best_addr as storage for the index
                local.tee $best_addr
                i32.const 3456
                i32.add
                i32.load8_u
                ;; repurposing this_fscore as memory[index]
                local.tee $this_fscore
                i32.const 2
                i32.eq
                local.get $this_fscore
                i32.eqz
                local.get $this_fscore
                i32.const 1
                i32.eq
                local.get $best_addr
                i32.load8_u
                i32.const 0
                i32.ne
                i32.and
                i32.or
                i32.or
                i32.eqz ;; is it false?
                (if
                    (then
                        ;; new g score
                        local.get $current_addr
                        i32.const 4
                        i32.add
                        i32.load
                        i32.const 1
                        i32.add
                        ;; the plan is foiled, f is actually g
                        ;; (2nd repurposing of this_fscore)
                        local.set $this_fscore
                        local.get $best_addr
                        i32.const 12
                        i32.mul
                        i32.const 6912
                        i32.add
                        ;; repurposing again: best_addr -> address of the neighbor
                        local.tee $best_addr
                        i32.const 4
                        i32.add
                        local.get $this_fscore
                        i32.store

                        ;; set parent
                        local.get $best_addr
                        local.get $current_addr
                        i32.store

                        local.get $best_addr
                        i32.const 8
                        i32.add
                        local.get $tx
                        local.get $ty
                        local.get $best ;; x
                        i32.const 1
                        i32.add
                        local.get $cursor ;; y
                        call $manhattan
                        i32.store

                        local.get $best_addr
                        call $open_set_insert_if_absent
                    )
                )
            )
        )

        i32.const 48388
        i32.load
        br_if $loop
    )

    ;; oh well
    i32.const 0
    return
)

(func $find_path (param $x i32) (param $y i32) (param $tx i32) (param $ty i32) (param $path_loc i32) (local $closest_dist i32) (local $counter i32) (local $val i32) (local $sx i32) (local $sy i32)
    call $init
    local.get $x
    local.get $y
    local.get $tx
    local.get $ty
    local.get $path_loc
    call $find_path_impl
    i32.eqz
    (if
        (then
            call $init
            local.get $x
            local.get $y
            i32.const 3455
            local.set $counter
            i32.const 4294967295
            local.set $closest_dist
            (loop $scan
                (; stack depth after this operation ;)
                (; 1 ;)local.get $counter
                (; 2 ;)i32.const 3456
                (; 1 ;)i32.add
                (; 1 ;)i32.load8_u
                (; 1 ;)local.tee $val
                (; 2 ;)i32.const 1
                (; 1 ;)i32.eq ;; NORMAL
                (; 2 ;)local.get $val
                (; 3 ;)i32.const 3
                (; 2 ;)i32.eq ;; NOTHING
                (; 3 ;)local.get $val
                (; 4 ;)i32.const 4
                (; 3 ;)i32.eq ;; DOORLIKE
                (; 2 ;)i32.or ;; NOTHING | DOORLIKE
                (; 1 ;)i32.or ;; NOTHING | DOORLIKE | NORMAL
                (; 2 ;)local.get $counter
                (; 2 ;)i32.load8_u
                (; 2 ;)i32.eqz
                (; 1 ;)i32.and ;; can_be_walked_through & (NOTHING | DOORLIKE | NORMAL)
                (; 2 ;)local.get $counter
                (; 3 ;)call $extract_xy
                (; 2 ;)local.set $sy
                (; 1 ;)local.set $sx
                (; normally that 1 should be 0 or 1 ;)

                ;; neighbor: UP
                (; 2 ;)i32.const 0
                (; 1 ;)local.set $val ;; val here -> is this neighbor unknown?
                (; 2 ;)local.get $sy
                (; 3 ;)i32.const 0
                (; 2 ;)i32.ne
                (; 1 ;)(if
                    (then
                        local.get $sx
                        local.get $sy
                        i32.const 1
                        i32.sub
                        i32.const 64
                        i32.mul
                        i32.add
                        i32.const 3456
                        i32.add
                        i32.load8_u
                        i32.eqz ;; == UNKNOWN?
                        local.set $val
                    )
                )
                (; 2 ;)local.get $val

                ;; neighbor: LEFT
                (; 3 ;)i32.const 0
                (; 2 ;)local.set $val ;; val here -> is this neighbor unknown?
                (; 3 ;)local.get $sx
                (; 4 ;)i32.const 0
                (; 3 ;)i32.ne
                (; 2 ;)(if
                    (then
                        local.get $sx
                        i32.const 1
                        i32.sub
                        local.get $sy
                        i32.const 64
                        i32.mul
                        i32.add
                        i32.const 3456
                        i32.add
                        i32.load8_u
                        i32.eqz ;; == UNKNOWN?
                        local.set $val
                    )
                )
                (; 3 ;)local.get $val

                ;; neighbor: DOWN
                (; 4 ;)i32.const 0
                (; 3 ;)local.set $val ;; val here -> is this neighbor unknown?
                (; 4 ;)local.get $sy
                (; 5 ;)i32.const 53
                (; 4 ;)i32.ne
                (; 3 ;)(if
                    (then
                        local.get $sx
                        local.get $sy
                        i32.const 1
                        i32.add
                        i32.const 64
                        i32.mul
                        i32.add
                        i32.const 3456
                        i32.add
                        i32.load8_u
                        i32.eqz ;; == UNKNOWN?
                        local.set $val
                    )
                )
                (; 4 ;)local.get $val

                ;; neighbor: RIGHT
                (; 5 ;)i32.const 0
                (; 4 ;)local.set $val ;; val here -> is this neighbor unknown?
                (; 5 ;)local.get $sx
                (; 6 ;)i32.const 63
                (; 5 ;)i32.ne
                (; 4 ;)(if
                    (then
                        local.get $sx
                        i32.const 1
                        i32.add
                        local.get $sy
                        i32.const 64
                        i32.mul
                        i32.add
                        i32.const 3456
                        i32.add
                        i32.load8_u
                        i32.eqz ;; == UNKNOWN?
                        local.set $val
                    )
                )
                (; 5 ;)local.get $val

                (; 4 ;)i32.or ;; down | right
                (; 3 ;)i32.or ;; down | right | left
                (; 2 ;)i32.or ;; down | right | left | up
                (; 1 ;)i32.and ;; (down | right | left | up) & can_be_walked_through & (NOTHING | DOORLIKE | NORMAL)

                (; 2 ;)local.get $x
                (; 3 ;)local.get $y
                (; 4 ;)local.get $sx
                (; 5 ;)local.get $sy
                (; 2 ;)call $manhattan
                (; 2 ;)local.tee $val
                (; 3 ;)local.get $closest_dist
                (; 2 ;)i32.le_u
                (; 1 ;)i32.and ;; closer & aforementioned conditions
                (; 0 ;)(if
                    (then
                        local.get $val
                        local.set $closest_dist
                        local.get $sx
                        local.set $tx
                        local.get $sy
                        local.set $ty
                    )
                )

                ;; increment counter
                (; 1 ;)local.get $counter
                (; 2 ;)i32.const 1
                (; 1 ;)i32.sub
                (; 1 ;)local.tee $counter
                (; 0 ;)br_if $scan
            )
            local.get $tx
            local.get $ty
            local.get $path_loc
            call $find_path_impl
            i32.eqz
            (if
                (then
                    ;; failure; return []
                    local.get $path_loc
                    i32.const 0
                    i32.store
                )
            )
        )
    )
)

(export "find_path" (func $find_path))

)