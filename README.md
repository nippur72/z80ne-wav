# z80ne-wav

Utility for decoding WAV files for the Z80 N.E. Nuova Elettronica computer. 

It takes a WAV file created with the LX.385 tape interface and produces a binary file. 

# Installation

You must have `node` installed. From the command prompt:

```
npm i z80ne-wav -g
```

# Usage

From the command prompt:

```
decodewav -i inputfile.wav -o outputfile.hex [--noheader] [-b 300|600|1200] [--invert]
```

The `--noheader` switch is used to skip the two bytes header that encode the starting address of the file in memory.

The `-b` option sets de baudrate (300 by default).

The `--invert` option inverts the polarity of the audio samples.

# WAV file data format

Data are saved on the WAV file using Kansas Standard format, with 1200 Hz and 2400 Hz signals (for 300 bps speed). To be precise to encode a binary 0 there are 4 periods at 1200 Hz, while to encode a binary 1 there are 8 periods at 2400 Hz.

For every data bytes these data bits are written on tape:

- 1 start bit at 0 (that is 4 periods at 1200 Hz)
- 8 data bits, encoded as explained previously, starting from the most meaningful bit to the less one
- 1 parity bit (even) computed on data bits: parity bit is 0 if the number of 1 of 8 data bits is even, it's 1 if the number of 1 of 8 data bits is odd
- 2 stop bits at 1 (that is 16 periods at 2400 Hz).

For higher speeds it's sufficient to double frequencies. So:

- for 300 bps 0 bits are at 1200 Hz, 1 bits are at 2400 Hz
- for 600 bps 0 bits are at 2400 Hz, 1 bits are at 4800 Hz
- for 1200 bps 0 bits are at 4800 Hz, 1 bits are at 9600 Hz.

The first two saved bytes are the memory address of the first following byte (the first byte is the most meaningful address byte, then there is the less meaningful one).
