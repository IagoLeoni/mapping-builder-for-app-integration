import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { 
  TreeView, 
  TreeItem,
  TreeItemProps 
} from '@mui/x-tree-view';
import { 
  ExpandMore, 
  ChevronRight,
  DragIndicator 
} from '@mui/icons-material';
import { Box, Chip, Typography } from '@mui/material';
import { PayloadField } from '../../types';

interface PayloadTreeProps {
  fields: PayloadField[];
}

interface DraggableTreeItemProps extends TreeItemProps {
  field: PayloadField;
}

const DraggableTreeItem: React.FC<DraggableTreeItemProps> = ({ field, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: field.id,
    data: field,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'primary';
      case 'number': return 'secondary';
      case 'boolean': return 'success';
      case 'object': return 'warning';
      case 'array': return 'info';
      default: return 'default';
    }
  };

  const label = (
    <Box 
      ref={setNodeRef}
      style={style}
      data-field-id={field.id}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        cursor: field.type !== 'object' ? 'grab' : 'default',
        '&:active': {
          cursor: field.type !== 'object' ? 'grabbing' : 'default'
        }
      }}
      {...attributes}
      {...(field.type !== 'object' ? listeners : {})}
    >
      {field.type !== 'object' && (
        <DragIndicator sx={{ fontSize: 16, color: 'text.secondary' }} />
      )}
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        {field.name}
      </Typography>
      <Chip 
        label={field.type} 
        size="small" 
        color={getTypeColor(field.type) as any}
        variant="outlined"
      />
    </Box>
  );

  return (
    <TreeItem
      {...props}
      label={label}
    >
      {field.children?.map((child) => (
        <DraggableTreeItem
          key={child.id}
          nodeId={child.id}
          field={child}
        />
      ))}
    </TreeItem>
  );
};

const PayloadTree: React.FC<PayloadTreeProps> = ({ fields }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <TreeView
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        sx={{ flexGrow: 1, maxWidth: '100%', overflowY: 'auto' }}
      >
        {fields.map((field) => (
          <DraggableTreeItem
            key={field.id}
            nodeId={field.id}
            field={field}
          />
        ))}
      </TreeView>
    </Box>
  );
};

export default PayloadTree;
