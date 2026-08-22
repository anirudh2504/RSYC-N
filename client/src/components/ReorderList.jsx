import { useEffect, useRef, useState } from 'react';
import { Icon } from './Ornaments.jsx';

/**
 * A list whose rows can be dragged into a new order.
 *
 * Built on pointer events rather than HTML5 drag-and-drop, which does not fire
 * on touch at all — and this club is used almost entirely from phones.
 *
 * Only the grip starts a drag. The rest of the row stays an ordinary link, so
 * arranging the board never gets in the way of tapping a member to open them.
 *
 * The arrow keys move a row too. That is not only for screen readers: dragging
 * a long list on a small screen means dragging past the edge, and nudging a
 * name up one step at a time is often simply easier.
 */
export default function ReorderList({ items, getKey, renderItem, onReorder }) {
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef(null);
  const state = useRef(null);

  // Follow the server while we are not in the middle of a drag.
  useEffect(() => {
    if (!state.current) setOrder(items);
  }, [items]);

  const commit = (next) => {
    setOrder(next);
    onReorder(next);
  };

  const moveBy = (from, to) => {
    if (to < 0 || to >= order.length || to === from) return;
    const next = order.slice();
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    commit(next);
  };

  const onPointerDown = (e, index) => {
    // Ignore anything but a primary press, so a right-click or a second finger
    // does not hijack a drag already under way.
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();

    const rows = Array.from(containerRef.current.querySelectorAll('[data-reorder-row]'));
    state.current = {
      index,
      // The slots stay where they are while a drag runs — only the contents
      // move between them — so these stay accurate without re-measuring.
      slots: rows.map((r) => r.getBoundingClientRect()),
      pointerId: e.pointerId,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(index);
    setOffset(0);
  };

  const onPointerMove = (e) => {
    const st = state.current;
    if (!st) return;

    const y = e.clientY;
    const slot = st.slots[st.index];
    setOffset(y - (slot.top + slot.height / 2));

    let target = st.index;
    for (let i = 0; i < st.slots.length; i += 1) {
      const mid = st.slots[i].top + st.slots[i].height / 2;
      if (i < st.index && y < mid) {
        target = i;
        break;
      }
      if (i > st.index && y > mid) target = i;
    }

    if (target !== st.index) {
      const next = order.slice();
      const [row] = next.splice(st.index, 1);
      next.splice(target, 0, row);
      setOrder(next);
      st.index = target;
      setDragging(target);
      setOffset(y - (st.slots[target].top + st.slots[target].height / 2));
    }
  };

  const onPointerUp = () => {
    const st = state.current;
    state.current = null;
    setDragging(null);
    setOffset(0);

    // Only tell the server if the order actually changed — picking a row up and
    // putting it back down is not a change worth a write.
    if (!st) return;
    const changed =
      order.length !== items.length ||
      order.some((row, i) => !items[i] || getKey(row) !== getKey(items[i]));
    if (changed) onReorder(order);
  };

  return (
    <div ref={containerRef} className="reorder">
      {order.map((item, index) => (
        <div
          key={getKey(item)}
          data-reorder-row=""
          className={`reorder-row${dragging === index ? ' is-dragging' : ''}`}
          style={dragging === index ? { transform: `translateY(${offset}px)` } : undefined}
        >
          <button
            type="button"
            className="grip"
            aria-label={`Move ${item.name || 'this row'}. Use the arrow keys, or drag.`}
            onPointerDown={(e) => onPointerDown(e, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveBy(index, index - 1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveBy(index, index + 1);
              }
            }}
          >
            <Icon.grip />
          </button>

          <div className="reorder-body">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  );
}
