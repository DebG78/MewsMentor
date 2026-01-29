import * as React from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  uploadedFile?: File | null;
  isProcessing?: boolean;
  error?: string | null;
  className?: string;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({
    onFileSelect,
    onFileRemove,
    acceptedFileTypes = [".csv", ".xlsx", ".xls"],
    maxFileSize = 10,
    uploadedFile,
    isProcessing = false,
    error,
    className,
  }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    };

    const handleFileSelection = (file: File) => {
      // Validate file type
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!acceptedFileTypes.includes(fileExtension)) {
        return;
      }

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return;
      }

      onFileSelect(file);
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      onFileRemove?.();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />

        {!uploadedFile ? (
          <Card
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg",
              isDragOver && "border-primary bg-primary/5",
              error && "border-destructive"
            )}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <div className={cn(
                "flex flex-col items-center text-center space-y-4",
                isDragOver && "scale-105"
              )}>
                <div className={cn(
                  "p-4 rounded-full border-2 border-dashed",
                  isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                )}>
                  <Upload className={cn(
                    "h-8 w-8",
                    isDragOver ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isDragOver ? "Drop your file here" : "Upload mentor & mentee data"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your CSV or Excel file, or click to browse
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {acceptedFileTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type.toUpperCase()}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Maximum file size: {maxFileSize}MB
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={cn(
            "border-2",
            error ? "border-destructive" : "border-green-200 bg-green-50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    error ? "bg-destructive/10" : "bg-green-100"
                  )}>
                    {isProcessing ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : error ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.size)}
                      {isProcessing && " • Processing..."}
                      {error && " • Error"}
                    </p>
                  </div>
                </div>

                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };