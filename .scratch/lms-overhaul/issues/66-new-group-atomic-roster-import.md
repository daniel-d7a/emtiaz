# 66: New group creation is not atomic with roster import

**What to build:** Create the group and import its roster in one operation, or roll the group back when the roster import fails. Today the new-group page creates the group first and imports students afterwards, so a failed import leaves an empty group behind.

**Blocked by:** None.

**Status:** done

- [x] A failed roster import does not leave an empty group.
- [x] The teacher sees one clear error for the whole operation.
