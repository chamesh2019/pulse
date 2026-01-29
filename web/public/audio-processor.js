class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this._bufferSize = (options.processorOptions && options.processorOptions.bufferSize) || 4096;
        this._buffer = new Int16Array(this._bufferSize);
        this._bytesWritten = 0;
    }

    process(inputs, _outputs, _parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputChannel = input[0];
            
            // Append to buffer
            for (let i = 0; i < inputChannel.length; i++) {
                let s = Math.max(-1, Math.min(1, inputChannel[i]));
                s = s < 0 ? s * 0x8000 : s * 0x7FFF;
                
                this._buffer[this._bytesWritten++] = s;

                // Flush if full
                if (this._bytesWritten >= this._bufferSize) {
                    this.port.postMessage(this._buffer.slice(0, this._bufferSize).buffer);
                    this._bytesWritten = 0;
                }
            }
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
