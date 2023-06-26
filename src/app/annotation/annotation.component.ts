import { Component, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';


interface Label {
  value: string;
  color: string;
}

interface Annotation {
  start: number;
  end: number;
  label: string;
  text: string;
}

@Component({
  selector: 'app-annotation-component',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.css']
})
export class AnnotationComponent {
  labels: Label[] = [];
  document: string = '';
  annotations: Annotation[] = [];
  newLabelValue: string = '';
  newLabelColor: string = '';

  @ViewChild('documentInput', { static: false }) documentInput!: ElementRef;

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {}

  addLabel() {
    if (this.newLabelValue && this.newLabelColor) {
      const label: Label = {
        value: this.newLabelValue,
        color: this.newLabelColor
      };
      this.labels.push(label);
      this.newLabelValue = '';
      this.newLabelColor = '';
    }
  }

  removeLabel(index: number) {
    this.labels.splice(index, 1);
  }

  annotateLabel(label: string) {
    const documentInput = this.documentInput.nativeElement as HTMLTextAreaElement;
    const selectionStart = documentInput.selectionStart;
    const selectionEnd = documentInput.selectionEnd;
    const selectedText = documentInput.value.substring(selectionStart, selectionEnd);

    if (selectedText.trim() !== '') {
      const annotation: Annotation = {
        start: selectionStart,
        end: selectionEnd,
        label,
        text: selectedText
      };

      this.annotations.push(annotation);
    }
    console.log(this.annotations);
  }

  getAnnotatedText(): SafeHtml {
    const documentLines = this.document.split('\n');
    let annotatedText = '';

    let position = 0;

    for (let i = 0; i < documentLines.length; i++) {
      const line = documentLines[i];
      const annotationsForLine = this.getAnnotationsForLine(i);

      if (annotationsForLine.length === 0) {
        annotatedText += line + '\n';
      } else {
        let lineWithAnnotations = '';
        let linePosition = 0;

        for (const annotation of annotationsForLine) {
          const prefix = '<span class="annotation" style="background-color:' + this.getLabelColor(annotation.label) + '">';
          const suffix = ' [' + annotation.label + ']</span>';

          const start = annotation.start - position;
          const end = annotation.end - position;

          lineWithAnnotations += line.substring(linePosition, start) + prefix + line.substring(start, end) + suffix;

          linePosition = end;
        }

        lineWithAnnotations += line.substring(linePosition) + '\n';
        annotatedText += lineWithAnnotations;
      }

      position += line.length + 1; 
    }

    return this.sanitizer.bypassSecurityTrustHtml(annotatedText);
  }

  getAnnotationsForLine(lineIndex: number): Annotation[] {
    const lineStart = this.getLineStartPosition(lineIndex);
    const lineEnd = this.getLineEndPosition(lineIndex);

    return this.annotations.filter(annotation => {
      return (
        (annotation.start >= lineStart && annotation.start <= lineEnd) ||
        (annotation.end >= lineStart && annotation.end <= lineEnd) ||
        (annotation.start <= lineStart && annotation.end >= lineEnd)
      );
    });
  }

  getLineStartPosition(lineIndex: number): number {
    let position = 0;
    const documentLines = this.document.split('\n');

    for (let i = 0; i < lineIndex; i++) {
      position += documentLines[i].length + 1; 
    }

    return position;
  }

  getLineEndPosition(lineIndex: number): number {
    let position = this.getLineStartPosition(lineIndex);
    const documentLines = this.document.split('\n');

    position += documentLines[lineIndex].length;

    return position;
  }

  getLabelColor(label: string) {
    const selectedLabel = this.labels.find(l => l.value === label);
    return selectedLabel ? selectedLabel.color : '';
  }

  exportAnnotations() {
    const json = JSON.stringify({
      document: this.document,
      annotations: this.annotations
    });

    
    const blob = new Blob([json], { type: 'application/json' });

    
    const url = URL.createObjectURL(blob);

    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'annotations.json';

    
    link.click();

    
    URL.revokeObjectURL(url);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
  
    this.http.post('http://localhost:8000/DocumentAnnotations/', json, { headers })
      .subscribe(
        () => {
          console.log('Annotations saved successfully.');
        },
        (error) => {
          console.error('Error saving annotations:', error);
        }
      );

  }
}
