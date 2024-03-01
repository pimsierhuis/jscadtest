const jscad = require('@jscad/modeling')
const { cube, sphere, cuboid, rectangle, polyhedron, cylinder } = jscad.primitives
const { translate, scale, rotateZ, align, rotateX, translateX, translateY, mirrorY } = jscad.transforms
const { hull, hullChain } = require('@jscad/modeling').hulls
const { intersect, subtract, union } = require('@jscad/modeling').booleans
const { measureArea, measureBoundingBox, measureVolume, measureAggregateBoundingBox } = require('@jscad/modeling').measurements
const { toPoints } = require('@jscad/modeling').geometries.geom2
const { vectorChar, vectorText } = require('@jscad/modeling').text
const { alignTo, flat_pyramid } = require('./util.js')



const switch_size = 5 // Assumed to be smaller than button_base_size
const switch_height = 3
const pin_size = 1
const pin_height = 2
const button_height = 3
const button_base_size = 18
const button_top_size = button_base_size - (2*button_height) // Bevel of 45 degrees
const button_hole_height = 2
const button_hole_radius = 1.5
const button_spacing = button_base_size + 2
const panel_height = 5
const panel_width = 100
const panel_depth = 90
// const panel_width = 20
// const panel_depth = 20
const cover_height = 2
const screw_hole_margin_x = 5
const screw_hole_margin_y = 5
const screw_hole_panel_height = 4
const screw_hole_panel_radius = 2.25
const screw_hole_cover_height = cover_height
const screw_hole_cover_radius = 1.6



function button() {

    const button = flat_pyramid({
        base_width:button_base_size,
        base_depth:button_base_size,
        top_width:button_top_size,
        top_depth:button_top_size,
        height:button_height})

    const hole = cylinder({
        height:button_hole_height,
        radius:button_hole_radius})

    return subtract(button, hole)
}

function tactile_switch_hole() {

    main_hole = cuboid({size:[switch_size, switch_size, switch_height]})
    pin_hole = cuboid({size:[pin_size, pin_size, pin_height]})

    return union(
        main_hole,
        alignTo({x:['min', 'min'], y:['center', 'center'], z:['max', 'min']}, pin_hole, main_hole),
        alignTo({x:['max', 'max'], y:['center', 'center'], z:['max', 'min']}, pin_hole, main_hole))
}

function screw_hole_panel() {
    return cylinder({height:screw_hole_panel_height, radius:screw_hole_panel_radius})
}

function screw_hole_cover () {
    return cylinder({height:screw_hole_cover_height, radius:screw_hole_cover_radius})
}

function repeat_on_screw_hole_locations(shape) {
    const r = rectangle({size:[panel_width - screw_hole_margin_x*2, panel_depth - screw_hole_margin_y*2]})
    const locations = toPoints(r)
    return repeat_on_locations(shape, locations)
}

function repeat_on_button_locations(shape) {
    const locations = to_physical_locations(button_logical_locations(), button_spacing)
    return repeat_on_locations(shape, locations)
}

function repeat_on_locations(shape, locations) {
    const holes = []

    for (let location of locations) {
        holes.push(translate([location[0], location[1], 0], shape))
    }

    return holes
}

function panel() {
    const result = cuboid({size:[panel_width,panel_depth,panel_height]})
    const aligned_switch_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_button_locations(tactile_switch_hole()), result)
    const aligned_screwholes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_screw_hole_locations(screw_hole_panel()), result)
    return subtract(result, aligned_switch_holes, aligned_screwholes)
}


function cover() {
    const result = cuboid({size:[panel_width,panel_depth,cover_height]})
    const aligned_button_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_button_locations(button()), result)
    const aligned_screw_holes = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_screw_hole_locations(screw_hole_cover()), result)
    return subtract(result, aligned_button_holes, aligned_screw_holes)
}

function buttons() {
    const panel_to_align_to = cuboid({size:[panel_width,panel_depth,panel_height]})
    const aligned_buttons = alignTo({x:['center', 'center'], y: ['center', 'center'], z: ['max', 'max']}, repeat_on_button_locations(button()), panel_to_align_to)

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
                locations.push([x,y])
            }
        }
    }

    return locations
}

function button_logical_locations() {
    return [
        [1,0,0,1,0],
        [1,0,1,0,1],
        [1,0,0,1,0],
        [1,0,0,0,0]]

    // return [[1]]
}


const main = (options) => {
    var shapes = []
    shapes.push(panel())
    shapes.push(translateX(panel_width + 10, cover()))
    shapes.push(translateY(panel_depth + 10, buttons()))

    return shapes
}


module.exports = { main }
