/**
 * The rules of the On this page sidebar, free of the DOM so each one is unit-tested. Topics and headings are
 * indexes in document order. The sidebar follows the reading:
 * 1. Once the reading moves to another topic, only that topic is open.
 * 2. A toggle opens or closes any topic; a topic opened that way stays open while the reading stays in its topic.
 * 3. A clicked heading is navigation: only its topic is open, also when it is the topic being read, and the heading
 *    is the current one, also at the end of the page, where it may never reach the top.
 */
export interface SpyState {
  /** The topic being read; null for a heading outside any topic. */
  topic: number | null;
  open: ReadonlySet<number>;
}

export const initialSpyState: SpyState = { topic: null, open: new Set() };

/** The reading is in `topic`: a move to another topic leaves only that one open; within a topic nothing changes. */
export const readTopic = (state: SpyState, topic: number | null): SpyState =>
  topic === state.topic ? state : jumpTo(topic);

/** A clicked heading in `topic` leaves only that topic open, also when the reading is already there. */
export const jumpTo = (topic: number | null): SpyState => ({
  topic,
  open: new Set(topic === null ? [] : [topic]),
});

/** A toggle opens a closed topic and closes an open one. */
export const toggleTopic = (state: SpyState, topic: number): SpyState => {
  const open = new Set(state.open);
  if (!open.delete(topic)) open.add(topic);
  return { ...state, open };
};

/**
 * The heading being read: the last one that has reached the reading line, the first while none has, and the last at
 * the end of the page, where the last headings may never reach the line.
 */
export const currentHeading = (
  reached: readonly boolean[],
  atEnd: boolean,
): number =>
  atEnd ? reached.length - 1 : Math.max(0, reached.lastIndexOf(true));

/** Where a jump to a clicked heading stops: the clicked heading while it is in view, else where the scroll says. */
export const settleJump = (
  clicked: number,
  clickedInView: boolean,
  fromScroll: number,
): number => (clickedInView ? clicked : fromScroll);
