# z80ne-wav

Utility for encoding/decoding WAV files for the Z80 N.E. Nuova Elettronica computer. 

`decodewav` takes a WAV file created with the LX.385 tape interface and produces a binary (.HEX) file. 
`encodewav` does the opposite, takes a .HEX file and generates a .WAV file to be loaded on the Z80NE. 

# Installation

You must have `node` installed. From the command prompt:

```
npm i z80ne-wav -g
```

# Decoding a WAV

From the command prompt:

```
decodewav -i inputfile.wav -o outputfile.hex [--noheader] [-b 300|600|1200] [--invert]
```

The `--noheader` switch is used to skip the two bytes header that encode the starting address of the file in memory.

The `-b` option sets de baudrate (300 by default).

The `--invert` option inverts the polarity of the audio samples.

# Encoding a WAV

From the command prompt:

```
encodewav -i inputfile.hex -o outputfile.wav [-b 300|600|1200] [-a address]
```

The `-b` option sets de baudrate (300 by default).

The `-a` option specifies the starting address in memory where the file is going to be loaded. 
If omitted, the starting address will be the first two bytes in the file.

# WAV file data format

Data are saved on the WAV file using Kansas Standard format, with 1200 Hz and 2400 Hz signals (for 300 bps speed). To be precise to encode a binary 0 there are 4 periods at 1200 Hz, while to encode a binary 1 there are 8 periods at 2400 Hz.

For every data bytes these data bits are written on tape:

- 1 start bit at 0 (that is 4 periods at 1200 Hz)
- 8 data bits, encoded as explained previously, starting from the least meaningful bit to the most one
- 1 parity bit (even) computed on data bits: parity bit is 0 if the number of 1 of 8 data bits is even, it's 1 if the number of 1 of 8 data bits is odd
- 2 stop bits at 1 (that is 16 periods at 2400 Hz).

For higher speeds it's sufficient to double frequencies. So:

- for 300 bps 0 bits are at 1200 Hz, 1 bits are at 2400 Hz
- for 600 bps 0 bits are at 2400 Hz, 1 bits are at 4800 Hz
- for 1200 bps 0 bits are at 4800 Hz, 1 bits are at 9600 Hz.

The first two saved bytes are the memory address of the first following byte (the first byte is the most meaningful address byte, then there is the less meaningful one).
