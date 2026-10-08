import React, { useEffect, useMemo, useState } from 'react';
import { Table, Empty, Grid } from 'antd';
import type { ColumnsType, ColumnType, SortOrder } from 'antd/es/table/interface';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { formatDateDDMMYYYY } from '../utils/formatDate';

interface MovieTableProps {
  movies: Movie[];
  onRowClick: (movie: Movie) => void;
  /** Changes whenever search/filters change — resets to page 1 (a data refresh alone doesn't). */
  filtersKey?: string;
  /** Receives the rows in the order currently shown (for Export CSV). */
  onDisplayedChange?: (rows: Movie[]) => void;
}

interface SortState {
  columnKey: React.Key | undefined;
  order: SortOrder;
}

const columns: ColumnsType<Movie> = [
  {
    title: 'ID',
    dataIndex: 'Movie ID',
    key: 'Movie ID',
    width: 80,
    sorter: (a, b) => (parseInt(a['Movie ID'], 10) || 0) - (parseInt(b['Movie ID'], 10) || 0),
  },
  {
    title: 'Name',
    dataIndex: 'Name',
    key: 'Name',
    width: 200,
    sorter: (a, b) => a.Name.localeCompare(b.Name),
    // The keyboard/screen-reader entry point for a row: Enter/Space on a native button fire a click,
    // which bubbles to the row's onClick — so no handler here, and rows keep their table semantics.
    render: (name: string, record) => (
      <button type="button" className="movie-name-button" aria-label={`View details for ${record.Name}`}>{name}</button>
    ),
  },
  {
    title: 'Language',
    dataIndex: 'Language',
    key: 'Language',
    width: 110,
    sorter: (a, b) => a.Language.localeCompare(b.Language),
    render: (code: string) => getLanguageName(code),
  },
  {
    title: 'Runtime (mins)',
    dataIndex: 'Runtime',
    key: 'Runtime',
    width: 120,
    sorter: (a, b) => (parseFloat(a.Runtime) || 0) - (parseFloat(b.Runtime) || 0),
  },
  {
    title: 'Year',
    dataIndex: 'Release Year',
    key: 'Release Year',
    width: 80,
    sorter: (a, b) => (parseInt(a['Release Year'], 10) || 0) - (parseInt(b['Release Year'], 10) || 0),
  },
  {
    title: 'Genres',
    dataIndex: 'Genres',
    key: 'Genres',
    width: 150,
    sorter: (a, b) => a.Genres.localeCompare(b.Genres),
    responsive: ['md'],
  },
  {
    title: 'Director',
    dataIndex: 'Director',
    key: 'Director',
    width: 150,
    sorter: (a, b) => a.Director.localeCompare(b.Director),
  },
  {
    title: 'Actors/Actresses',
    dataIndex: 'Actors/Actresses',
    key: 'Actors/Actresses',
    width: 180,
    sorter: (a, b) => a['Actors/Actresses'].localeCompare(b['Actors/Actresses']),
    responsive: ['lg'],
  },
  {
    title: 'Production Company',
    dataIndex: 'Production Company',
    key: 'Production Company',
    width: 180,
    sorter: (a, b) => a['Production Company'].localeCompare(b['Production Company']),
    responsive: ['lg'],
  },
  {
    title: 'Country',
    dataIndex: 'Production Country',
    key: 'Production Country',
    width: 100,
    sorter: (a, b) => a['Production Country'].localeCompare(b['Production Country']),
    responsive: ['md'],
  },
  {
    title: 'Vote Avg',
    dataIndex: 'Vote Average',
    key: 'Vote Average',
    width: 90,
    sorter: (a, b) => (parseFloat(a['Vote Average']) || 0) - (parseFloat(b['Vote Average']) || 0),
  },
  {
    title: 'Release Date',
    dataIndex: 'Release Date',
    key: 'Release Date',
    width: 120,
    sorter: (a, b) => a['Release Date'].localeCompare(b['Release Date']),
    render: (date: string) => formatDateDDMMYYYY(date),
  },
];

const MovieTable: React.FC<MovieTableProps> = ({ movies, onRowClick, filtersKey, onDisplayedChange }) => {
  const screens = Grid.useBreakpoint();
  // Sort and pagination are controlled (not Ant-internal) so they survive a catalogue refresh,
  // the page can reset on filter change, and the sorted order can be reported for export.
  const [sort, setSort] = useState<SortState>({ columnKey: undefined, order: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

  const controlledColumns = useMemo<ColumnsType<Movie>>(
    () => columns.map((col) => ({ ...col, sortOrder: col.key === sort.columnKey ? sort.order : null })),
    [sort]
  );

  // Same comparator and direction Ant applies to dataSource (descend = negated compare, stable),
  // so this matches the on-screen order exactly.
  const sortedMovies = useMemo(() => {
    const col = columns.find((c) => c.key === sort.columnKey) as ColumnType<Movie> | undefined;
    const sorter = col?.sorter;
    if (!sort.order || typeof sorter !== 'function') return movies;
    const dir = sort.order === 'descend' ? -1 : 1;
    return [...movies].sort((a, b) => dir * sorter(a, b, sort.order));
  }, [movies, sort]);

  useEffect(() => {
    onDisplayedChange?.(sortedMovies);
  }, [sortedMovies, onDisplayedChange]);

  const pageCount = Math.max(1, Math.ceil(movies.length / pageSize));
  const safePage = Math.min(page, pageCount);

  return (
    <div>
      <Table<Movie>
        dataSource={movies}
        columns={controlledColumns}
        onChange={(pagination, _filters, sorter) => {
          // One handler for both: Ant resets to page 1 itself when the sort changes.
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          setSort({ columnKey: s?.order ? s.columnKey : undefined, order: s?.order ?? null });
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? pageSize);
        }}
        rowKey="Movie ID"
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={
          screens.sm
            ? {
                current: safePage,
                pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} movies`,
              }
            : { current: safePage, pageSize, simple: true }
        }
        scroll={{ x: 'max-content' }}
        sticky
        size="small"
        rowClassName={(_, index) =>
          index % 2 === 0 ? 'movie-row-even' : 'movie-row-odd'
        }
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No movies match your filters"
            />
          ),
        }}
      />
    </div>
  );
};

export default MovieTable;
