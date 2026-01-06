import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Paperclip, X, Image, FileText, Video, Music, 
  Download, Eye, File 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FileAttachment {
  file: File;
  preview?: string;
  type: string;
}

interface FileAttachmentPickerProps {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxSize?: number; // in MB
  maxFiles?: number;
}

const FileAttachmentPicker = ({
  attachments,
  onAttachmentsChange,
  maxSize = 250,
  maxFiles = 10
}: FileAttachmentPickerProps) => {
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles = files.filter(file => {
      // Check size
      const maxBytes = maxSize * 1024 * 1024;
      if (file.size > maxBytes) {
        return false;
      }
      return true;
    });

    // Check max files
    const availableSlots = maxFiles - attachments.length;
    const filesToAdd = validFiles.slice(0, availableSlots);

    const newAttachments: FileAttachment[] = filesToAdd.map(file => {
      const attachment: FileAttachment = {
        file,
        type: file.type
      };

      // Create preview for images and videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        attachment.preview = URL.createObjectURL(file);
      }

      return attachment;
    });

    onAttachmentsChange([...attachments, ...newAttachments]);
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    if (attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FileText className="w-4 h-4 text-green-500" />;
    if (type.includes('powerpoint') || type.includes('presentation')) return <FileText className="w-4 h-4 text-orange-500" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={attachments.length >= maxFiles}
      >
        <Paperclip className="w-4 h-4 mr-2" />
        Joindre ({attachments.length}/{maxFiles})
      </Button>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group flex items-center gap-2 bg-background rounded-lg p-2 pr-8 border"
              >
                {/* Preview or Icon */}
                {attachment.preview && attachment.type.startsWith('image/') ? (
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded cursor-pointer"
                    onClick={() => setPreviewFile(attachment)}
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(attachment.type)}
                  </div>
                )}

                {/* File info */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {attachment.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file.size)}
                  </span>
                </div>

                {/* Preview button */}
                {(attachment.type.startsWith('image/') || attachment.type.startsWith('video/')) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => setPreviewFile(attachment)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.file.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {previewFile?.type.startsWith('image/') && (
              <img
                src={previewFile.preview}
                alt="Preview"
                className="max-h-[60vh] object-contain rounded-lg"
              />
            )}
            {previewFile?.type.startsWith('video/') && (
              <video
                src={previewFile.preview}
                controls
                className="max-h-[60vh] rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileAttachmentPicker;
