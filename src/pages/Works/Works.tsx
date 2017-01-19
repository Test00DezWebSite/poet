import * as React from 'react';
import { Link } from 'react-router';

import { FetchComponentProps } from '../../hocs/FetchComponent';
import ProfileLink from '../../components/ProfileLink';

import Pagination from '../../components/Pagination';
import WorksComponent from '../../hocs/Works';
import { WorkProps } from '../../hocs/WorkComponent';

import './Layout.scss';

function renderWork(props: WorkProps) {
  return (
    <li key={props.id} className="mb-3">
      <h3><Link to={'/works/' + props.id}>{props.name}</Link></h3>
      <div>by <ProfileLink id={props.author} /></div>
      <small><span>Created: {props.published}</span> <span className="ml-3">Timestampted: {props.published}</span></small>
      <div>{props.content}</div>
    </li>
  )
}

function render(props: FetchComponentProps) {
  return (
    <div className="works-results">
      <h4 className="mb-3">Showing {props.elements.length} results</h4>
      <ul className="list-unstyled">
        { props.elements.map(renderWork) }
      </ul>
      <Pagination />
    </div>
  )
}

export default WorksComponent(render);