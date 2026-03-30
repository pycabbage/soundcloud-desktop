/**
 * A play source — an object passed to playSource() / toggleSource() /
 * isSourcePlaying() / isSourceActive().
 *
 * The internal shape is a Backbone.Collection or stream object.
 * Typed as opaque here; consumers should not rely on its internal structure.
 */
export type PlaySource = Backbone.Collection | object
