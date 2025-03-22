import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpEventType } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  selectedFile: File | null = null;
  uploading = false;
  uploadProgress = 0;
  uploadComplete = false;
  uploadError = false;
  errorMessage = '';
  isDragOver = false;
  fileName = '';
  question = '';
  answer = '';
  showRequiredError: boolean = false;

  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  cancelSelection(): void {
    this.selectedFile = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadComplete = false;
    this.uploadError = false;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http
      .post(this.apiUrl + 'drive-management/file-convert', formData, {
        responseType: 'blob',
        observe: 'events',
        reportProgress: true
      })
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            if (event.total) {
              this.uploadProgress = Math.round((event.loaded / event.total) * 100);
            }
          } else if (event.type === HttpEventType.Response) {

            const blob = new Blob([event.body], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'converted_files.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.uploading = false;
            this.uploadComplete = true;

            setTimeout(() => {
              this.uploadComplete = false;
              this.selectedFile = null;
            }, 3000);
          }
        },
        error: (error) => {
          this.uploading = false;
          this.uploadError = true;

          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorResponse = JSON.parse(reader.result as string);
              const notifications = errorResponse.notifications || [];
              this.errorMessage = notifications.length > 0 ? notifications[0] : 'Ocorreu um erro desconhecido';
            } catch (e) {
              this.errorMessage = 'Erro ao processar a resposta do servidor';
            }
          };
          reader.readAsText(error.error);
        }
      });
  }

  askQuestion(): void {
    if (!this.fileName.trim()) {
      this.showRequiredError = true;
      this.answer = '';
      return;
    }

    this.showRequiredError = false;
    
    const body = {
      fileName: this.fileName,
      question: !this.question.trim() ? undefined : this.question
    };

    this.http.post<any>(this.apiUrl + 'drive-management/file-analyze', body)
      .subscribe(response => {
        this.answer = response.data?.answer || 'Nenhuma resposta encontrada';
      }, (e) => {
        let notifications = e.error.notifications;
        this.answer = notifications ? notifications[0] : 'Erro ao obter resposta';
      });
  }
}