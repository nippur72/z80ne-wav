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
decodewav -i inputfile.wav -o outputfile.hex [-noheader]
```

The `-noheader` switch is used to skip the two bytes header that encode the starting address of the file in memory.

# WAV file data format

Data are saved on the WAV file using Kansas Standard format, with 1200 Hz and 2400 Hz signals (for 300 bps speed). To be precise to encode a binary 0 there are 4 periods at 1200 Hz, while to encode a binary 1 there are 8 periods at 2400 Hz.

For every data bytes these data bits are written on tape:

- 1 start bit at 0 (that is 4 periods at 1200 Hz)
- 8 data bits, encoded as explained previously, starting from the most meaningful bit to the less one
- 1 parity bit (even) computed on data bits: parity bit is 0 if the number of 1 of 8 data bits is even, it's 1 if the number of 1 of 8 data bits is odd
- 2 stop bits at 1 (that is 16 periods at 2400 Hz).

The first two saved bytes are the memory address of the first following byte (the first byte is the most meaningful address byte, then there is the less meaningful one).
