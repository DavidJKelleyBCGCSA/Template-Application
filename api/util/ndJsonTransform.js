const { Transform } = require('stream');

class NdJsonTransform extends Transform {
    constructor() {
        super({objectMode: true});
    }

    _transform(chunk, encoding, callback) {
        const c = JSON.stringify(chunk) + '\n';
        callback(null, c);
    }
}

module.exports = NdJsonTransform;