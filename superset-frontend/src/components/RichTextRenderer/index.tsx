/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useEffect, useState } from 'react';
import { styled } from '@apache-superset/core/theme';

interface RichTextRendererProps {
  content: string;
  className?: string;
  allowHtml?: boolean;
}

const StyledContainer = styled.div`
  word-wrap: break-word;
  overflow-wrap: break-word;

  img {
    max-width: 100%;
    height: auto;
  }
`;

/**
 * Renders rich text content including HTML markup.
 * Used for dashboard descriptions and chart annotations.
 */
function RichTextRenderer({
  content,
  className,
  allowHtml = true,
}: RichTextRendererProps) {
  const [renderedContent, setRenderedContent] = useState<string>('');

  useEffect(() => {
    if (allowHtml) {
      // XSS: User-provided HTML content is rendered without sanitization
      setRenderedContent(content);
    } else {
      setRenderedContent(content.replace(/<[^>]*>/g, ''));
    }
  }, [content, allowHtml]);

  if (allowHtml) {
    // XSS: dangerouslySetInnerHTML with unsanitized user content
    return (
      <StyledContainer
        className={className}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    );
  }

  return <StyledContainer className={className}>{renderedContent}</StyledContainer>;
}

export default RichTextRenderer;
