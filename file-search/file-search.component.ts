// file-search.component.ts
import { FileSearchService } from '../file-search.service';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, inject } from '@angular/core';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { HistoryService } from '../history.service';
import { MatTreeModule } from '@angular/material/tree';
import { MatTreeNode } from '@angular/material/tree';

@Component({
  selector: 'app-file-search',
  templateUrl: './file-search.component.html'
})
export class FileSearchComponent {

  constructor(private fileSearchService: FileSearchService, private historyService: HistoryService) { }

  searchData = {
    dir: '',
    filter: '',
    ext: ''
  };

  currentDepth: number = 0;

  //Variable para manejar la carga
  loading: boolean = false;
  noResults: boolean = false;

  //Guardar la busqueda actual en el historial
  searchResults: any[] = [];
  totalFiles: number = 0;
  totalOccurrences: number = 0;
  extensionCounts: any;
  highlightedRow: any;
  extensionChips: string[] = [];
  previousResults: any[] = [];
  searchingFinished: boolean = false;


  //Funcion para obtener extensiones unicas para Chips
  getUniqueExtensions(files: any[]): string[] {
    const extensionSet = new Set<string>();
    files.forEach(f => {
      const fileExt = f.file.split('.').pop().toLocaleLowerCase();
      if (fileExt) extensionSet.add(fileExt);
    });
    return Array.from(extensionSet);
  }

  searchFiles() {

    if (this.searchingFinished) {
      console.log("Busqueda recursiva finalizada, resultados iguales")
      return
    }

    this.noResults = false;
    this.loading = true;

    //Guardar la busqueda actual en el historial
    this.historyService.pushToHistory(this.searchData.filter)

    //Realiza la busqueda
    this.fileSearchService.searchFiles(this.searchData).subscribe({
      next: (result) => {
        console.log('Search result:', result);
        this.searchResults = result.result;
        this.totalFiles = result.totalFiles;
        this.totalOccurrences = result.totalOccurrences;
        this.highlightedRow = result.highlightedRow;

        this.extensionChips = this.getUniqueExtensions(this.searchResults);
        console.log(this, this.extensionChips);

        //Marca como no cargando despues de recibir los resultados
        this.loading = false;
        this.noResults = this.searchResults.length === 0;

        // Verificar la condición de finalización para el historial
        if (this.previousResults.length > 0 && JSON.stringify(this.previousResults) === JSON.stringify(result)) {
          console.log("Búsqueda recursiva finalizada: resultados iguales");
          this.searchingFinished = true;
          this.previousResults = [];
          return;
        }
        this.previousResults = result.result;
      }
    });

  }

  searchRecursively(row: any, parentIndex: number | null = null, depth: number = this.currentDepth) {
    console.log(depth)

    // Extrae solo el nombre del archivo con la extensión
    const fileNameWithExt = row.file.split('\\').pop();
    // Usa el nombre del archivo como nuevo filtro
    this.searchData.filter = fileNameWithExt;

    row.showNextLevelButton = true; // Boton para mostrar el siguiente nivel
    row.childrenLoaded = false; // Indica que los resultados anidados no se han cargado


    this.fileSearchService.searchFiles(this.searchData).subscribe({
      next: (result) => {
        console.log('Result from search:', result);
        row.result = result.result;

        // Agrega logging para verificar la estructura de result.result
        console.log('Result structure:', result.result);

        // Realiza búsquedas recursivas para cada resultado de la búsqueda actual
        if (result.result && result.result.length > 0) {
          console.log('Entering the if condition de searchRecursively');

          row.children = result.result.map((nestedResult: any, index: number) => {
            console.log("Esto es row.children: ", row.children)
            nestedResult.index = index + 1;
            nestedResult.parent = row;
            nestedResult.depth = depth
            console.log(this.currentDepth, depth)
            console.log("NESTED RESULT:", nestedResult);
            return nestedResult;
          });

          //Esta parte del codigo muestra todos los niveles automaticamente para cada resultado anidado hasta el cuarto nivel
          //Si se borra, unicamente se muestra el resultado del primer nivel.
           /*  if (depth < 4) {
            row.children.forEach((childResult: any) => {
              this.searchRecursively(childResult, null, this.currentDepth + 1);
            });
            //Por qué aqui si funcion pero fuera ya no funciona.
          } */

        }

      }
    })
  }

  loadNextLevel(row: any) {
    //row.showNextLevelButton = false; // Oculta el botón después de hacer clic
    row.childrenLoaded = true; // Marca que los resultados anidados se han cargado

    if (row.children && row.children.length > 0) {
      row.children.forEach((childResult: any) => {
        if (!childResult.childrenLoaded) {
          this.searchRecursively(childResult, null, this.currentDepth++);
      }});
    }
  }


  getFullHistory(): string[] {
    return this.historyService.getHistory();
  }

  getFileUrl(filePath: string): string {
    return `http://localhost:3000/static/${filePath}`;
  }

  // Función para resaltar el filtro en la fila
  highlightFilter(row: string, filter: string): string {
    return row.replace(new RegExp(filter, 'gi'), match => `<span class="highlight">${match}</span>`);
  }


  //Funciones para chips
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  announcer = inject(LiveAnnouncer);

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.extensionChips.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(ext: string): void {
    const index = this.extensionChips.indexOf(ext);

    if (index >= 0) {
      this.extensionChips.splice(index, 1);

      this.announcer.announce(`Removed ${ext}`);
    }
  }

  edit(ext: string, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove fruit if it no longer has a name
    if (!value) {
      this.remove(ext);
      return;
    }

    // Edit existing fruit
    const index = this.extensionChips.indexOf(ext);
    if (index >= 0) {
      this.extensionChips[index] = value;
    }
  }

}

