import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideOptionsStub } from '@features/catalog/testing/catalog-options';
import { CatalogColumn, CatalogRow, CatalogTable } from './catalog-table';

const COLUMNS: CatalogColumn[] = [
  { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
  { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
  { key: 'tests_count', labelKey: 'CATALOG_MODULE.COL.TESTS', kind: 'count' },
  { key: 'is_active', labelKey: 'CATALOG_MODULE.COL.STATE', kind: 'active' },
];
const BADGE_COLUMNS: CatalogColumn[] = [
  { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
  { key: 'dimension', labelKey: 'CATALOG_MODULE.COL.DIMENSION', kind: 'enum', options: 'dimension' },
  { key: 'dimensions', labelKey: 'CATALOG_MODULE.COL.DIMENSIONS', kind: 'list', options: 'dimension' },
];
const ROWS: CatalogRow[] = [
  { id: 'a', code: 'CAP-1', name: 'Capacidad', tests_count: 3, is_active: true },
  { id: 'b', code: 'CAP-2', name: 'Otra', tests_count: 0, is_active: false },
];

describe('CatalogTable', () => {
  let fixture: ComponentFixture<CatalogTable>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CatalogTable], providers: [provideTranslateService(), provideOptionsStub()] });
    fixture = TestBed.createComponent(CatalogTable);
    fixture.componentRef.setInput('columns', COLUMNS);
    fixture.componentRef.setInput('rows', ROWS);
    fixture.componentRef.setInput('captionKey', 'CATALOG_MODULE.TABS.CONTROLS');
    fixture.componentRef.setInput('total', 60);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.detectChanges();
  });

  it('draws the shared table with a code, a state and the page of the catalog', () => {
    expect(el().querySelectorAll('tbody tr').length).toBe(2);
    expect(el().querySelector('app-tag')!.textContent).toContain('CAP-1');
    const states = Array.from(el().querySelectorAll('app-status-indicator')).map((s) => s.getAttribute('data-tone'));
    expect(states).toEqual(['ok', 'neutral']);
    expect(el().textContent).toContain('COMMON.TABLE.SHOWING');
  });

  it('opens the row that is pressed and asks for the page that is pressed', () => {
    const opened: string[] = [];
    const pages: number[] = [];
    fixture.componentInstance.rowClick.subscribe((r) => opened.push(r.id));
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    el().querySelectorAll<HTMLElement>('tbody tr')[1].click();
    el().querySelector<HTMLButtonElement>('[data-next]')!.click();
    expect(opened).toEqual(['b']);
    expect(pages).toEqual([2]);
  });

  it('paints one attribute badge per value of an enum or list column, coloured by the stable value', () => {
    fixture.componentRef.setInput('columns', BADGE_COLUMNS);
    fixture.componentRef.setInput('rows', [{ id: 'a', code: 'X-1', dimension: 'policy', dimensions: ['policy', 'server'] }, { id: 'b', code: 'X-2', dimension: null, dimensions: [] }]);
    fixture.detectChanges();
    const rows = el().querySelectorAll('tbody tr');
    const badges = (i: number) => Array.from(rows[i].querySelectorAll('app-badge[data-kind="attribute"]'));
    expect(badges(0).length).toBe(3);
    expect(badges(0)[0].getAttribute('data-color')).toBe(badges(0)[1].getAttribute('data-color'));
    expect(badges(1).length).toBe(0);
  });
});
