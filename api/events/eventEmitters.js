
/* eslint-disable max-classes-per-file */

const EventEmitter = require('events');

class ActivityEmitter extends EventEmitter {

    send(channel, ...data) {
        this.emit(channel, ...data);
    }
}

class DiscussionEmitter extends EventEmitter {

}

module.exports = {ActivityEmitter, DiscussionEmitter};

/* eslint-enable max-classes-per-file */