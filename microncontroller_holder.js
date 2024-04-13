const jscad = require('@jscad/modeling')
const { cube, sphere, cuboid, rectangle, polyhedron, cylinder, roundedRectangle } = jscad.primitives
const { translate, scale, rotateZ, align, rotateX, translateX, translateY, mirrorY } = jscad.transforms
const { hull, hullChain } = require('@jscad/modeling').hulls
const { intersect, subtract, union } = require('@jscad/modeling').booleans
const { measureArea, measureBoundingBox, measureVolume, measureAggregateBoundingBox } = require('@jscad/modeling').measurements
const { toPoints } = require('@jscad/modeling').geometries.geom2
const { vectorChar, vectorText } = require('@jscad/modeling').text
const { alignTo, flat_pyramid, hull2d, createTextShape } = require('./util.js')
const { extrudeLinear, extrudeRectangular, extrudeRotate } = require('@jscad/modeling').extrusions

const base_height = 4
const base_depth = 9
const hole_r = 1.5
const hole_cbore_r = 3
const hole_cbore_height = 3
const pcb_width = 33.6
const pcb_depth = 19
const pcb_height = 1.8
const thick_x = 3
const thick_y = 1
const holder_flenge = 0.4


const holder = () => {

    const base_block = cuboid({size:[pcb_width + 2*thick_x,base_depth,base_height]})
    const hole = cylinder({height: base_height, radius: hole_r})
    const hole_cbore = alignTo({z:'max'}, cylinder({height: hole_cbore_height, radius: hole_cbore_r}), hole)
    const complete_screwhole = union(hole, hole_cbore)
    const base = subtract(base_block, alignTo({z:'max'}, complete_screwhole, base_block))
    
    const holder_block = cuboid({size:[pcb_width + 2*thick_x, pcb_height+2*thick_y, pcb_depth]})
    const pcb_groove = cuboid({size:[pcb_width, pcb_height, pcb_depth]})
    const complete_hole = cuboid({size:[pcb_width - 2*holder_flenge, pcb_height + 2*thick_y, pcb_depth]})
    const holder = subtract(holder_block, pcb_groove, complete_hole)
    return union(base, alignTo({z:['min','max'], y:'center'}, holder, base))
}

const main = (options) => {
    var shapes = []
    shapes.push(holder())

    return shapes
}


module.exports = { main }
