import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home link */}
        <li>
          <Link href="/producer" className="text-gray-400 hover:text-gray-500">
            <HomeIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="h-5 w-5 text-gray-300 mx-2" aria-hidden="true" />
            
            {item.current ? (
              <span className="text-sm font-medium text-gray-500 truncate max-w-48" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <Link 
                href={item.href} 
                className="text-sm font-medium text-gray-700 hover:text-gray-900 truncate max-w-48"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500 truncate max-w-48">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}