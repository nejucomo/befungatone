=============
¡Befungatone!
=============

Befungatone is a graphical, musical, `Befunge`_ interpreter.  It is
built on html5 tech, and is intended to run in modern browsers.

Status
======

The basic board graphics, user input, and interaction are in place.
Not all of the befunge instructions are implemented yet.  There is no
audio yet.  There is a dearth of test automation.  I've been manually
testing it on Chromium.

Roadmap
=======

#. Implement all of the befunge instructions, with sensical replacements for i/o instructions.
#. Add "innate" sounds: each instruction triggers some quiet, percussive sound.

At this point it will be "feature complete" for an alpha, and I'll
probably focus on testing and supporting multiple browsers.  Future
features might be:

* "explicit" sounds: special output instructions control synthesizers.
* load/save source code to the clipboard as normal befunge source text.
* load/save source code to the URL fragment so people can share links without server involvement.

Related Projects
================

* `befungee`_ is a console python interpreter for Befunge.
* The author of Befungatone also maintains a `fork of the above`_.

.. references

.. _`Befunge`: http://esolangs.org/wiki/befunge
.. _`befungee`: https://github.com/programble/befungee
.. _`fork of the above`: https://github.com/nejucomo/befungee

