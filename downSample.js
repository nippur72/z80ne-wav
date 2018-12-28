function downSample(samples, sampleRate, newSampleRate) {
    let s = [];
    let ptr = 0;
    let acc = 0;

    for(let t=0; t<samples.length; t++) {
        acc += samples[t];
        ptr += newSampleRate;
        if(ptr >= sampleRate) {
            s.push(acc * (newSampleRate / sampleRate));
            acc = 0;
            ptr -= sampleRate;                        
        }
    }

    return s;    
}

module.exports = downSample;

