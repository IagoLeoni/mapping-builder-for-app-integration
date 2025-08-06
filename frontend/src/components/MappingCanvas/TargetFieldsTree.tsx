import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { 
  TreeView, 
  TreeItem,
  TreeItemProps 
} from '@mui/x-tree-view';
import { 
  ExpandMore, 
  ChevronRight,
  Delete,
  Transform,
  Settings
} from '@mui/icons-material';
import { Box, Chip, Typography, IconButton, Tooltip } from '@mui/material';
import { PayloadField, MappingConnection, TransformationConfig } from '../../types';
import TransformationModal from './TransformationModal';

interface TargetFieldsTreeProps {
  fields: PayloadField[];
  mappings: MappingConnection[];
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, transformation: TransformationConfig) => void;
}

interface DroppableTreeItemProps extends TreeItemProps {
  field: PayloadField;
  mappings: MappingConnection[];
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, transformation: TransformationConfig) => void;
}

const DroppableTreeItem: React.FC<DroppableTreeItemProps> = ({ 
  field, 
  mappings, 
  onRemoveMapping,
  onUpdateMapping,
  ...props 
}) => {
  const [transformationModalOpen, setTransformationModalOpen] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: field.path,
  });

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

  const mapping = mappings.find(m => m.targetPath === field.path);

  const label = (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      width: '100%'
    }}>
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        {field.name}
      </Typography>
      <Chip 
        label={field.type} 
        size="small" 
        color={getTypeColor(field.type) as any}
        variant="outlined"
      />
      {mapping && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveMapping(mapping.id);
          }}
          color="error"
          sx={{ ml: 1 }}
        >
          <Delete fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  // Only render drop area for leaf fields (no children)
  if (!field.children) {
    return (
      <>
        <TreeItem
          {...props}
          label={
            <Box>
              {label}
              <Box
                ref={setNodeRef}
                data-droppable-id={field.path}
                sx={{
                  mt: 1,
                  p: 1,
                  border: isOver ? '2px dashed #1976d2' : '2px dashed #ccc',
                  borderRadius: 1,
                  backgroundColor: isOver ? '#e3f2fd' : mapping ? '#e8f5e8' : '#f5f5f5',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {mapping ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" color="success.main" sx={{ fontSize: '0.75rem' }}>
                        Mapped to: {mapping.sourceField.name} ({mapping.sourceField.path})
                      </Typography>
                      {mapping.transformation && (
                        <Chip 
                          label={mapping.transformation.type} 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: '16px', mt: 0.5 }}
                        />
                      )}
                    </Box>
                    <Tooltip title={mapping.transformation ? "Edit Transformation" : "Add Transformation"}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransformationModalOpen(true);
                        }}
                        color={mapping.transformation ? "warning" : "primary"}
                      >
                        {mapping.transformation ? <Settings fontSize="small" /> : <Transform fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    Drop a field here to map
                  </Typography>
                )}
              </Box>
            </Box>
          }
        />
        
        {mapping && (
          <TransformationModal
            open={transformationModalOpen}
            onClose={() => setTransformationModalOpen(false)}
            onSave={(transformation) => onUpdateMapping(mapping.id, transformation)}
            initialTransformation={mapping.transformation}
            sourceFieldName={mapping.sourceField.name}
            targetFieldName={field.name}
          />
        )}
      </>
    );
  }

  // For container fields (with children), just show the label
  return (
    <TreeItem
      {...props}
      label={label}
    >
      {field.children?.map((child) => (
        <DroppableTreeItem
          key={child.id}
          nodeId={child.id}
          field={child}
          mappings={mappings}
          onRemoveMapping={onRemoveMapping}
          onUpdateMapping={onUpdateMapping}
        />
      ))}
    </TreeItem>
  );
};

const TargetFieldsTree: React.FC<TargetFieldsTreeProps> = ({ 
  fields, 
  mappings, 
  onRemoveMapping,
  onUpdateMapping 
}) => {
  if (fields.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '200px',
        color: 'text.secondary'
      }}>
        <Typography variant="body2">
          Please define your target system schema above to start mapping fields
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <TreeView
        defaultCollapseIcon={<ExpandMore />}
        defaultExpandIcon={<ChevronRight />}
        sx={{ flexGrow: 1, maxWidth: '100%', overflowY: 'auto' }}
      >
        {fields.map((field) => (
          <DroppableTreeItem
            key={field.id}
            nodeId={field.id}
            field={field}
            mappings={mappings}
            onRemoveMapping={onRemoveMapping}
            onUpdateMapping={onUpdateMapping}
          />
        ))}
      </TreeView>
    </Box>
  );
};

export default TargetFieldsTree;
