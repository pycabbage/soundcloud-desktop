/**
 * The global Backbone.Events singleton used as a cross-module event bus.
 * Module 10 in System A.
 *
 * Every Sound player event is forwarded here as "audio:{eventName}".
 * Google Cast events are also published here.
 */
export type GlobalEventBus = Backbone.Events
