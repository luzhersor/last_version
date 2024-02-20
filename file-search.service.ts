// file-search.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class FileSearchService {
  private apiUrl = 'http://localhost:3000/checkStringInFiles';

  constructor(private http: HttpClient) { }

  searchFiles(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

}
