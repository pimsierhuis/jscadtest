const jscad = require('@jscad/modeling')
const { cube, sphere, cuboid, rectangle, polyhedron, cylinder, roundedRectangle } = jscad.primitives
const { translate, scale, rotateZ, align, rotateX, translateX, translateY, mirrorY } = jscad.transforms
const { hull, hullChain } = require('@jscad/modeling').hulls
const { intersect, subtract, union } = require('@jscad/modeling').booleans
const { measureArea, measureBoundingBox, measureVolume, measureAggregateBoundingBox } = require('@jscad/modeling').measurements
const { toPoints } = require('@jscad/modeling').geometries.geom2
const { vectorChar, vectorText } = require('@jscad/modeling').text
const { alignTo, flat_pyramid, hull2d, createTextShape } = require('./util.js')


const switch_size = 6.3 // Assumed to be smaller than button_base_size
const switch_height = 3.8
const pin_size = 1
const pin_height = 7
const button_total_height = 3
const button_flenge_height = 1
const button_base_size = 18
const button_top_size = button_base_size - 4; // 2mm flenge
const button_round_radius = 3
const button_hole_height = 0.4
const button_hole_radius = 1.7
const button_spacing = button_base_size + 2
const button_coverhole_margin_width = 0.6
const button_coverhole_margin_height = 0.6
const panel_round_radius = 1
const panel_height = 5.5
const panel_width = 150
const panel_depth = 100
// const panel_width = 30
// const panel_depth = 30
const cover_height = 2.0
const screw_hole_margin_x = 10
const screw_hole_margin_y = 5
const screw_hole_panel_height = 5.5
const screw_hole_panel_radius = 2.3
const screw_hole_cover_height = cover_height
const screw_hole_cover_radius = 1.6

const screw_hole_panel_machine_rect_width = 143.8
const screw_hole_panel_machine_rect_depth = 93.7



function button(label) {

    const shape_top = roundedRectangle({size: [button_top_size,button_top_size], roundRadius: button_round_radius})
    const button_top = hull2d(shape_top, shape_top, button_total_height - button_flenge_height)

    const shape_bottom = roundedRectangle({size: [button_base_size, button_base_size], roundRadius: button_round_radius})
    const button_base = hull2d(shape_bottom, shape_bottom, button_flenge_height)

    const button = union(alignTo({z: ['min', 'max']}, button_top, button_base), button_base)

    const hole = cylinder({
        height:button_hole_height,
        radius:button_hole_radius})

    const completeButton = subtract(button, alignTo({z:'min'}, hole, button))
    if (label == 1) {
        return completeButton
    } else {
        const text = alignTo({z:['min','max'], x: 'center', y:'center'}, createTextShape(label, cylinder({height:0.4, radius:0.25})), completeButton)

        return union(completeButton, text)
    }
}

function button_hole() {
    const shape_top = roundedRectangle({size: [button_top_size + button_coverhole_margin_width, button_top_size + button_coverhole_margin_width], roundRadius: button_round_radius})
    const button_top = hull2d(shape_top, shape_top, button_total_height - button_flenge_height)

    const shape_bottom = roundedRectangle({size: [button_base_size + button_coverhole_margin_width, button_base_size + button_coverhole_margin_width], roundRadius: button_round_radius})
    const button_base = hull2d(shape_bottom, shape_bottom, button_flenge_height + button_coverhole_margin_height)

    const button = union(alignTo({z: ['min', 'max']}, button_top, button_base), button_base)

    return button
}

function tactile_switch_hole() {

    main_hole = cuboid({size:[switch_size, switch_size, switch_height]})
    pin_hole = cuboid({size:[pin_size, pin_size, pin_height]})

    return union(
        main_hole,
        alignTo({x:'min', z:['max', 'min']}, pin_hole, main_hole),
        alignTo({x:'max', z:['max', 'min']}, pin_hole, main_hole))
}

function screw_hole_panel() {
    return cylinder({height:screw_hole_panel_height, radius:screw_hole_panel_radius})
}

function screw_hole_cover () {
    return cylinder({height:screw_hole_cover_height, radius:screw_hole_cover_radius})
}

function repeat_on_screw_hole_locations(shapefunc) {
    const r = rectangle({size:[panel_width - screw_hole_margin_x*2, panel_depth - screw_hole_margin_y*2]})
    const locations = toPoints(r)
    return repeat_on_locations(shapefunc, locations)
}

function repeat_on_button_locations(shapefunc) {
    const locations = to_physical_locations(button_logical_locations(), button_spacing)
    return repeat_on_locations(shapefunc, locations)
}

function repeat_on_locations(shapefunc, locations) {
    const shapes = []

    for (let location of locations) {
        const shape = shapefunc(location[2])
        shapes.push(translate([location[0], location[1], 0], shape))
    }

    return shapes
}

function panel() {

    const shape = roundedRectangle({size: [panel_width, panel_depth], roundRadius: panel_round_radius})
    const result = hull2d(shape, shape, panel_height)
    const aligned_switch_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_button_locations(() => tactile_switch_hole()), result)
    const aligned_screwholes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_screw_hole_locations(() => screw_hole_panel()), result)

    const r = rectangle({size:[screw_hole_panel_machine_rect_width, screw_hole_panel_machine_rect_depth]})
    const locations = toPoints(r)
    const aligned_screwholes_panel_machine = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_locations(() => screw_hole_panel(), locations), result)
    
    const microcontroller_hole = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, screw_hole_panel(), result)
    
    return subtract(result, aligned_switch_holes, aligned_screwholes, aligned_screwholes_panel_machine, microcontroller_hole)
}


function cover() {
    const shape = roundedRectangle({size: [panel_width, panel_depth], roundRadius: panel_round_radius})
    const result = hull2d(shape, shape, cover_height)

    const aligned_button_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['min', 'min']}, repeat_on_button_locations(() => button_hole()), result)
    const aligned_screw_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_screw_hole_locations(() => screw_hole_cover()), result)
    return subtract(result, aligned_button_holes, aligned_screw_holes)
}

function buttons() {
    const panel_to_align_to = cuboid({size:[panel_width,panel_depth,panel_height]})
    const aligned_buttons = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_button_locations((label) => button(label)), panel_to_align_to)

    return aligned_buttons
}

 // All rows are assumed to have the same number of columns
function to_physical_locations(logical_locations, spacing) {

    const locations = []
    const rows = logical_locations.length
    const cols = logical_locations[0].length


    for (let row = 0; row < rows; row++) {
        const y = (rows * spacing) - (row*spacing)
        for (let col = 0; col < cols; col++) {
            const x = col * spacing
            if (logical_locations[row][col] != 0) {
                locations.push([x,y, logical_locations[row][col]])
            }
        }
    }

    return locations
}

function button_logical_locations() {
    return [
        ['Home',      1,0,0,1     ,0],
        ['Start\njob',1,0,1,'Zero',1],
        ['Res\nume',  1,0,0,1     ,0],
        ['Pause',     1,0,0,0     ,0]]

    // return [['Home']]
}


const main = (options) => {
    var shapes = []
    const heightDeterminingShape = panel()
    shapes.push(panel(heightDeterminingShape))
    shapes.push(alignTo({z:'min'}, rotateX(Math.PI, translateX(panel_width + 10, cover())), heightDeterminingShape))
    shapes.push(alignTo({z:'min'}, translateY(panel_depth + 10, buttons()), heightDeterminingShape))

    return shapes
}


module.exports = { main }
