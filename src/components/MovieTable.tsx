import React from 'react';
import { Table, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Movie } from '../types/movie';

interface MovieTableProps {
  movies: Movie[];
  onRowClick: (movie: Movie) => void;
}

const columns: ColumnsType<Movie> = [
  { title: 'ID', dataIndex: 'Movie ID', key: 'Movie ID', width: 80 },
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
    width: 100,
    sorter: (a, b) => a.Language.localeCompare(b.Language),
  },
  {
    title: 'Runtime (mins)',
    dataIndex: 'Runtime',
    key: 'Runtime',
    width: 120,
    sorter: (a, b) => parseFloat(a.Runtime) - parseFloat(b.Runtime),
  },
  {
    title: 'Year',
    dataIndex: 'Release Year',
    key: 'Release Year',
    width: 80,
    sorter: (a, b) => parseInt(a['Release Year'], 10) - parseInt(b['Release Year'], 10),
  },
  { title: 'Genres', dataIndex: 'Genres', key: 'Genres', width: 150 },
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
  },
  {
    title: 'Production Company',
    dataIndex: 'Production Company',
    key: 'Production Company',
    width: 180,
  },
  {
    title: 'Country',
    dataIndex: 'Production Country',
    key: 'Production Country',
    width: 100,
    sorter: (a, b) => a['Production Country'].localeCompare(b['Production Country']),
  },
  {
    title: 'Vote Avg',
    dataIndex: 'Vote Average',
    key: 'Vote Average',
    width: 90,
    sorter: (a, b) => parseFloat(a['Vote Average']) - parseFloat(b['Vote Average']),
  },
  {
    title: 'Release Date',
    dataIndex: 'Release Date',
    key: 'Release Date',
    width: 120,
  },
];

const MovieTable: React.FC<MovieTableProps> = ({ movies, onRowClick }) => {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #2d3748 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>
          🎬 Movie List
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Click a row to view details
        </span>
      </div>
      <Table<Movie>
        dataSource={movies}
        columns={columns}
        rowKey="Movie ID"
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} movies`,
        }}
        scroll={{ x: 'max-content', y: 600 }}
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
