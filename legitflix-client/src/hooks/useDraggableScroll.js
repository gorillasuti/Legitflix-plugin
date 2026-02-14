import { useState, useRef, useEffect, useCallback } from 'react';

export const useDraggableScroll = (ref, options = { direction: 'horizontal' }) => {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef(0);
    const scrollStart = useRef(0);
    const dragDistance = useRef(0);
    const isMouseDown = useRef(false);

    const onMouseDown = useCallback((e) => {
        // Only drag on left click (button 0)
        if (e.button !== 0) return;

        if (!ref.current) return;
        isMouseDown.current = true;
        setIsDragging(true);
        dragDistance.current = 0;

        if (options.direction === 'horizontal') {
            startPos.current = e.pageX - ref.current.offsetLeft;
            scrollStart.current = ref.current.scrollLeft;
        } else {
            startPos.current = e.pageY - ref.current.offsetTop;
            scrollStart.current = ref.current.scrollTop;
        }

        // Prevent default text selection during drag
        e.preventDefault();
    }, [ref, options.direction]);

    const onMouseLeave = useCallback(() => {
        isMouseDown.current = false;
        setIsDragging(false);
    }, []);

    const onMouseUp = useCallback(() => {
        isMouseDown.current = false;
        // Delay resetting dragging state slightly to allow onClick handlers to check it
        setTimeout(() => setIsDragging(false), 0);
    }, []);

    const onMouseMove = useCallback((e) => {
        if (!isMouseDown.current || !ref.current) return;

        e.preventDefault();

        if (options.direction === 'horizontal') {
            const x = e.pageX - ref.current.offsetLeft;
            const walk = (x - startPos.current) * 1.5; // Scroll speed multiplier
            ref.current.scrollLeft = scrollStart.current - walk;
            dragDistance.current = Math.abs(walk);
        } else {
            const y = e.pageY - ref.current.offsetTop;
            const walk = (y - startPos.current) * 1.5;
            ref.current.scrollTop = scrollStart.current - walk;
            dragDistance.current = Math.abs(walk);
        }
    }, [ref, options.direction]);

    const onClickCapture = useCallback((e) => {
        // If we dragged a significant amount, stop the click
        if (dragDistance.current > 5) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    // Return event handlers and state
    return {
        events: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
            onClickCapture
        },
        isDragging,
        dragDistance: dragDistance.current
    }; // We return dragDistance just in case, but usually use events
};
