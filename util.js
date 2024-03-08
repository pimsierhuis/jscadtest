const jscad = require('@jscad/modeling')
const { cube, sphere, cuboid, rectangle, polyhedron, cylinder } = jscad.primitives
const { translate, scale, rotateZ, align, rotateX, translateX, translateY, mirrorY } = jscad.transforms
const { hull, hullChain } = require('@jscad/modeling').hulls
const { intersect, subtract, union } = require('@jscad/modeling').booleans
const { measureArea, measureBoundingBox, measureVolume, measureAggregateBoundingBox } = require('@jscad/modeling').measurements
const { toPoints } = require('@jscad/modeling').geometries.geom2


/**
* Construct a pyramid consisting of two connected rectangles above each other (called base and top)
* @param {Object} options - options for construction
* @param {Number} options.base_width - Width of base of pyramid
* @param {Number} options.base_depth - Depth of base of pyramid
* @param {Number} options.top_width - Width of top of pyramid
* @param {Number} options.top_depth - Depth of top of pyramid
* @param {Number} options.height - Height of pyramid
* @returns {geom3} Polyhedron representing the pyramid
*/
const flat_pyramid = (options) => {

    const base_half_width = options.base_width / 2
    const base_half_depth = options.base_depth / 2
    const top_half_width = options.top_width / 2
    const top_half_depth = options.top_depth / 2

    const points = [
        [-base_half_width, -base_half_depth, 0],
        [ base_half_width, -base_half_depth, 0],
        [ base_half_width,  base_half_depth, 0],
        [-base_half_width,  base_half_depth, 0],

        [-top_half_width,  -top_half_depth,  options.height],
        [ top_half_width,  -top_half_depth,  options.height],
        [ top_half_width,   top_half_depth,  options.height],
        [-top_half_width,   top_half_depth,  options.height]
    ]

    const faces = [
        [3,2,1,0], // top

        [0,1,5,4], //sides
        [1,2,6,5],
        [2,3,7,6],
        [3,0,4,7],

        [4,5,6,7] // bottom
    ]
    return polyhedron({points: points, faces: faces, orientation: 'outward'})
}

function hull2d(shape_top, shape_bottom, height) {

    const points_top = toPoints(shape_top).map((p) => [p[0], p[1], height])
    const points_bottom = toPoints(shape_bottom).map((p) => [p[0], p[1], 0])

    if (points_top.length != points_bottom.length) {
        throw new Error('shape_top and shape_bottom must have equally many points')
    }

    const num_points = points_top.length

    const faces = []
    faces.push(Array.from({length: num_points}, (_, i) => num_points - i - 1))
    faces.push(Array.from({length: num_points}, (_, i) => num_points + i))
    

    for (let i = 0; i < num_points-1; i++) {
        faces.push([i, i+1, num_points + i + 1, num_points + i])
    }
    faces.push([num_points - 1, 0, num_points, num_points * 2 - 1])

    for (let f of faces) {
        console.log("F " + f)
    }

    return polyhedron({points: points_top.concat(points_bottom), faces: faces, orientation: 'inward'})
}


/**
 * Translate {@link geom} to align with {@link alignToGeom} according to specified options.
 * 
 * @param {Array} options.x - Array with in index 0 the x-option ('min'/'max'/'center') of {@link geom} to align to (in position 1) the x-option of {@link alignToGeom}. See example.
 * @param {Array} options.y - See options.x
 * @param {Array} options.z - See options.x
 * @param geom The geometry to be aligned
 * @param alignToGeom The geometry to align {@link geom} to
 * @returns Translated geom
 *
 * @example
 * // Align the x-minimum of geom to x-minimum of alignToGeom and y-center of geom to y-maximum of alignToGeom
 *
 * let alignedGeom = alignTo({x:['min', 'min'], y:['center', 'max']}, geom, alignToGeom)
 */
const alignTo = (options, geom, alignToGeom) => {

    const bbGeom = measureAggregateBoundingBox(geom);
    const bbAlignToGeom = measureAggregateBoundingBox(alignToGeom);

    const translation = [0,0,0]

    if ('x' in options) {
        translation[0] = alignValue(options['x'], 0, bbGeom, bbAlignToGeom)
    }
    if ('y' in options) {
        translation[1] = alignValue(options['y'], 1, bbGeom, bbAlignToGeom)
    }
    if ('z' in options) {
        translation[2] = alignValue(options['z'], 2, bbGeom, bbAlignToGeom)
    }

    return translate(translation, geom)
}

const alignValue = (optionValue, dim, bbGeom, bbAlignToGeom) => {
    let optionGeom = ''
    let optionAlignToGeom = ''

    if (typeof optionValue === 'string') {
        optionGeom = optionValue
        optionAlignToGeom = optionValue
    } else {
        optionGeom = optionValue[0]
        optionAlignToGeom = optionValue[1]
    }
    return alignOptionValue(bbAlignToGeom, dim, optionAlignToGeom) - alignOptionValue(bbGeom, dim, optionGeom)
}

const alignOptionValue = (bb, dim, option) => {

    if (option === 'min') {
        return bb[0][dim]
    } else if (option === 'max') {
        return bb[1][dim]
    } else if (option === 'center') {
        return (bb[0][dim] + bb[1][dim]) / 2;
    } else {
        return 0;
    }
}

// TODO: Onderstaande afmaken


const round_edge = (shape, r) => {

    bb = measureBoundingBox(shape)

    ys = bb[1][1] - bb[0][1]

    pos_hap = [...bb[1]]
    pos_hap[0] -= r/2
    pos_hap[1] -= ys/2
    pos_hap[2] -= r/2

    pos_s1 = [...bb[1]]
    pos_s1[0] -= r
    // pos_s1[1] -= r
    pos_s1[2] -= r

    pos_s2 = [...bb[1]]
    pos_s2[0] -= r
    // pos_s2[1] -= ys-r
    pos_s2[1] -= ys
    pos_s2[2] -= r

    h = translate(pos_hap, cuboid({size: [r,4,r]}))

    // c1 = translate(pos_s1, cube({size:r}))
    // c2 = translate(pos_s2, cube({size:r}))
    // h = hull(c1,c2)

    s1 = translate(pos_s1, sphere({radius:r}))
    s2 = translate(pos_s2, sphere({radius:r}))

    rounded_edge = intersect(h, hull(s1,s2))

    result = subtract(shape, h)
    result = union(result, rounded_edge)
    
    return result
} 

const round_edge2 = (shape, r) => {

    bb = measureBoundingBox(shape)

    rpos1 = [1,0,1]
    rpos2 = [1,1,1]

    pos1 = [bb[rpos1[0]][0], bb[rpos1[1]][1], bb[rpos1[2]][2]]
    pos2 = [bb[rpos2[0]][0], bb[rpos2[1]][1], bb[rpos2[2]][2]]

    ys = bb[1][1] - bb[0][1]

    pos_hap = [...bb[1]]
    pos_hap[0] += r/2 * (rpos1[0] == 1 ? -1 : 1)
    pos_hap[1] -= ys/2
    pos_hap[2] -= r/2

    pos_s1 = [...bb[1]]
    pos_s1[0] -= r
    // pos_s1[1] -= r
    pos_s1[2] -= r

    pos_s2 = [...bb[1]]
    pos_s2[0] -= r
    // pos_s2[1] -= ys-r
    pos_s2[1] -= ys
    pos_s2[2] -= r

    h = translate(pos_hap, cuboid({size: [r,4,r]}))

    // c1 = translate(pos_s1, cube({size:r}))
    // c2 = translate(pos_s2, cube({size:r}))
    // h = hull(c1,c2)

    s1 = translate(pos_s1, sphere({radius:r}))
    s2 = translate(pos_s2, sphere({radius:r}))

    rounded_edge = intersect(h, hull(s1,s2))

    result = subtract(shape, h)
    result = union(result, rounded_edge)
    
    return result
}


module.exports = { flat_pyramid, alignTo, hull2d }
