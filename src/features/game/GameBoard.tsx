  const handlePress = (index: number) => {
    if (isProtected(index)) return;
    const now = Date.now();
    const pending = pendingTap.current;

    if (pending && pending.index === index && now - pending.timestamp <= DOUBLE_TAP_WINDOW_MS) {
      clearPendingTap();
      invokeForIndex(index, 'double');
      return;
    }

    if (pending) clearPendingTap();

    const originalState = session.boardState.cells[index]!;
    const timer = setTimeout(() => {
      if (pendingTap.current?.index !== index) return;
      pendingTap.current = null;
      invokeForIndex(index, 'press');
    }, DOUBLE_TAP_WINDOW_MS);

    pendingTap.current = { index, timestamp: now, originalState, timer };
  };