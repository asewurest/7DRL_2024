(module
(import "memory" "mem" (memory 1))

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

(func $backtrace (param $path_loc i32) (param $ptr i32) (local $addr i32) (local $count i32)
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

(func $find_path (param $x i32) (param $y i32) (param $tx i32) (param $ty i32) (param $path_loc i32) (result i32) (local $current_addr)
    ;; so...
    ;; terrain is 64x54 (3456)
    ;; memory @ 0    -> solidity map (1 byte each)
    ;; memory @ 3456 -> memory map (1 byte each)
    ;; memory @ 6912 -> pathfinding data (parent: i32(addr); g: i32; f: i32 -> 12 bytes each)
    ;; memory @ $path_loc -> path length
    ;; memory @ $path_loc + 4 -> path elements, in reverse
    ;; max i32 value = 4294967295

    call $init

    local.get $y
    i32.const 64
    i32.mul
    local.get $x
    i32.add
    i32.const 12
    i32.add
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
)

(export "find_path" (func $find_path))

)