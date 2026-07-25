import React from 'react';
import { Table, Empty, Grid } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Movie } from '../types/movie';
import { getLanguageName } from '../utils/languages';
import { formatDateDDMMYYYY } from '../utils/formatDate';

interface MovieTableProps {
  movies: Movie[];
  onRowClick: (movie: Movie) => void;
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

const MovieTable: React.FC<MovieTableProps> = ({ movies, onRowClick }) => {
  const screens = Grid.useBreakpoint();

  return (
    <div>
      <Table<Movie>
        dataSource={movies}
        columns={columns}
        rowKey="Movie ID"
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(record);
            }
          },
          tabIndex: 0,
          role: 'button',
          'aria-label': `View details for ${record.Name}`,
          style: { cursor: 'pointer' },
        })}
        pagination={
          screens.sm
            ? {
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} movies`,
              }
            : { defaultPageSize: 10, simple: true }
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
